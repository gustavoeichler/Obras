"""BOM (cotação) service: CRUD + cheapest-store-combination optimizer."""
from flask import abort

from app.extensions import db
from app.middleware.auth import check_project_access
from app.models.bom import BOMQuotation, BOMProduct, BOMStore, BOMPrice


# ── CRUD ──────────────────────────────────────────────────────────────────────

def list_quotations(project_id, user):
    check_project_access(project_id, user)
    return (
        BOMQuotation.query
        .filter_by(project_id=project_id)
        .order_by(BOMQuotation.updated_at.desc())
        .all()
    )


def get_quotation(project_id, quotation_id, user):
    check_project_access(project_id, user)
    q = BOMQuotation.query.get_or_404(quotation_id)
    if q.project_id != project_id:
        abort(404)
    return q


def create_quotation(project_id, data, user):
    check_project_access(project_id, user)
    q = BOMQuotation(project_id=project_id, name=data["name"])
    db.session.add(q)
    db.session.flush()
    _replace_children(q, data)
    db.session.commit()
    return q


def update_quotation(project_id, quotation_id, data, user):
    q = get_quotation(project_id, quotation_id, user)
    if "name" in data:
        q.name = data["name"]
    if any(k in data for k in ("products", "stores", "prices")):
        _replace_children(q, data)
    db.session.commit()
    return q


def delete_quotation(project_id, quotation_id, user):
    q = get_quotation(project_id, quotation_id, user)
    db.session.delete(q)
    db.session.commit()


def _replace_children(q, data):
    """Replace nested products/stores/prices on a quotation in one transaction."""
    products_in = data.get("products", [])
    stores_in   = data.get("stores", [])
    prices_in   = data.get("prices", [])

    # Wipe existing children — simpler than diffing and avoids stale FK refs.
    for child in list(q.prices):
        db.session.delete(child)
    for child in list(q.products):
        db.session.delete(child)
    for child in list(q.stores):
        db.session.delete(child)
    db.session.flush()

    # Track client-supplied ids → newly assigned ids so prices can reference them.
    product_id_map = {}
    store_id_map = {}

    for i, p in enumerate(products_in):
        prod = BOMProduct(
            quotation_id=q.id,
            name=p["name"],
            quantity=p.get("quantity", 1.0),
            position=p.get("position", i),
        )
        db.session.add(prod)
        db.session.flush()
        if "id" in p and p["id"] is not None:
            product_id_map[p["id"]] = prod.id

    for i, s in enumerate(stores_in):
        store = BOMStore(
            quotation_id=q.id,
            name=s["name"],
            delivery_cost=s.get("delivery_cost", 0.0),
            position=s.get("position", i),
        )
        db.session.add(store)
        db.session.flush()
        if "id" in s and s["id"] is not None:
            store_id_map[s["id"]] = store.id

    for cell in prices_in:
        pid = product_id_map.get(cell["product_id"], cell["product_id"])
        sid = store_id_map.get(cell["store_id"], cell["store_id"])
        db.session.add(BOMPrice(
            quotation_id=q.id,
            product_id=pid,
            store_id=sid,
            price=cell.get("price"),
        ))


# ── Optimizer ────────────────────────────────────────────────────────────────
#
# All strategies share the same input/output contract:
#
#   inputs:  products [{key, ...}], stores [{key, name, delivery_cost}],
#            prices [{product_key, store_key, price | None}]
#   output:  {"feasible": bool, "total": float, "stores_used": [name, ...],
#             "assignments": [{product_key, store_key, price}, ...]}
#
# Inputs use opaque "key" strings so unsaved grids (no DB ids) can be optimized.
# A solution is "feasible" when every product is sourced from some store.

# Cap brute force search; 2**20 ≈ 1M masks is the practical limit.
BRUTE_FORCE_MAX_STORES = 20

OPTIMIZATION_METHODS = [
    {"key": "brute_force",        "label": "Ótimo global (força bruta)"},
    {"key": "single_store",       "label": "Loja única mais barata"},
    {"key": "cheapest_per_item",  "label": "Item mais barato (sem consolidar)"},
    {"key": "greedy_consolidate", "label": "Heurística: consolidar lojas"},
    {"key": "greedy_add",         "label": "Heurística: adicionar lojas"},
]


def _empty_result():
    return {"feasible": False, "total": 0.0, "stores_used": [], "assignments": []}


def _build_indexes(products, stores, prices):
    """Normalise inputs into lookup tables shared by every strategy."""
    store_keys  = [s["key"] for s in stores]
    store_names = {s["key"]: s["name"] for s in stores}
    delivery    = {s["key"]: float(s.get("delivery_cost") or 0) for s in stores}

    # price_map[product_key][store_key] -> float (only populated entries)
    price_map = {p["key"]: {} for p in products}
    for cell in prices:
        pkey = cell["product_key"]
        skey = cell["store_key"]
        val  = cell.get("price")
        if val is None or pkey not in price_map:
            continue
        price_map[pkey][skey] = float(val)

    return store_keys, store_names, delivery, price_map


def _format(store_keys_used, assignments, total, store_names):
    return {
        "feasible":    True,
        "total":       total,
        "stores_used": [store_names[k] for k in store_keys_used],
        "assignments": assignments,
    }


# ── Strategy 1: brute force (optimal) ────────────────────────────────────────

def optimize_brute_force(products, stores, prices):
    """Exhaustive search over all 2**n store subsets — guaranteed optimal."""
    store_keys, store_names, delivery, price_map = _build_indexes(products, stores, prices)
    n = len(store_keys)

    if n == 0 or not products:
        return _empty_result()
    if n > BRUTE_FORCE_MAX_STORES:
        # Too expensive; caller should fall back to a heuristic.
        return _empty_result()

    best_total = float("inf")
    best_subset = None
    best_assignment = None

    for mask in range(1, 1 << n):
        subset_total = sum(
            delivery[store_keys[i]] for i in range(n) if mask & (1 << i)
        )
        assignment = []
        valid = True

        for product in products:
            pkey = product["key"]
            min_price = float("inf")
            chosen = None
            for i in range(n):
                if not (mask & (1 << i)):
                    continue
                skey = store_keys[i]
                cell = price_map[pkey].get(skey)
                if cell is None:
                    continue
                if cell < min_price:
                    min_price, chosen = cell, skey

            if chosen is None:
                valid = False
                break

            subset_total += min_price
            assignment.append({
                "product_key": pkey,
                "store_key":   chosen,
                "price":       min_price,
            })

        if valid and subset_total < best_total:
            best_total = subset_total
            best_subset = mask
            best_assignment = assignment

    if best_assignment is None:
        return _empty_result()

    used = [store_keys[i] for i in range(n) if best_subset & (1 << i)]
    return _format(used, best_assignment, best_total, store_names)


# ── Strategy 2: single store ─────────────────────────────────────────────────

def optimize_single_store(products, stores, prices):
    """Pick the one store that supplies every product at the lowest total cost.

    Useful when consolidation matters more than per-item savings (one delivery,
    single relationship, simpler logistics).
    """
    store_keys, store_names, delivery, price_map = _build_indexes(products, stores, prices)
    if not store_keys or not products:
        return _empty_result()

    best_total = float("inf")
    best_store = None
    best_assignment = None

    for skey in store_keys:
        # Store must price every product to qualify.
        assignment = []
        total = delivery[skey]
        complete = True
        for product in products:
            pkey = product["key"]
            cell = price_map[pkey].get(skey)
            if cell is None:
                complete = False
                break
            total += cell
            assignment.append({"product_key": pkey, "store_key": skey, "price": cell})

        if complete and total < best_total:
            best_total = total
            best_store = skey
            best_assignment = assignment

    if best_assignment is None:
        return _empty_result()
    return _format([best_store], best_assignment, best_total, store_names)


# ── Strategy 3: cheapest per item (greedy, no consolidation) ─────────────────

def optimize_cheapest_per_item(products, stores, prices):
    """For each product, pick its cheapest store independently.

    Lower bound on item cost; ignores that splitting orders multiplies delivery
    fees. Cheap to compute and useful as a baseline.
    """
    store_keys, store_names, delivery, price_map = _build_indexes(products, stores, prices)
    if not store_keys or not products:
        return _empty_result()

    used = set()
    assignment = []
    items_total = 0.0

    for product in products:
        pkey = product["key"]
        candidates = price_map[pkey]
        if not candidates:
            return _empty_result()
        skey, price = min(candidates.items(), key=lambda kv: kv[1])
        items_total += price
        used.add(skey)
        assignment.append({"product_key": pkey, "store_key": skey, "price": price})

    delivery_total = sum(delivery[s] for s in used)
    used_ordered = [k for k in store_keys if k in used]
    return _format(used_ordered, assignment, items_total + delivery_total, store_names)


# ── Strategy 4: greedy consolidation heuristic ───────────────────────────────

def _evaluate_subset(products, store_subset, delivery, price_map):
    """Cost + assignment of pricing every product against `store_subset`.

    Returns (total, assignment) or (None, None) if any product has no price
    in the subset.
    """
    if not store_subset:
        return None, None
    total = sum(delivery[s] for s in store_subset)
    assignment = []
    for product in products:
        pkey = product["key"]
        best_price = float("inf")
        chosen = None
        for skey in store_subset:
            cell = price_map[pkey].get(skey)
            if cell is None or cell >= best_price:
                continue
            best_price, chosen = cell, skey
        if chosen is None:
            return None, None
        total += best_price
        assignment.append({"product_key": pkey, "store_key": chosen, "price": best_price})
    return total, assignment


def optimize_greedy_consolidate(products, stores, prices):
    """Start from the cheapest-per-item set, then drop stores while feasible.

    Each iteration tries removing every currently-used store and commits the
    removal that reduces total cost the most. Stops at a local optimum. Tends
    to find solutions close to brute force when delivery fees dominate.
    """
    store_keys, store_names, delivery, price_map = _build_indexes(products, stores, prices)
    if not store_keys or not products:
        return _empty_result()

    seed = optimize_cheapest_per_item(products, stores, prices)
    if not seed["feasible"]:
        return _empty_result()

    used_names = set(seed["stores_used"])
    name_to_key = {store_names[k]: k for k in store_keys}
    current = set(name_to_key[n] for n in used_names if n in name_to_key)
    best_total, best_assignment = _evaluate_subset(products, current, delivery, price_map)

    improved = True
    while improved and len(current) > 1:
        improved = False
        best_drop = None
        best_drop_total = best_total
        best_drop_assignment = best_assignment

        for skey in list(current):
            candidate = current - {skey}
            total, assignment = _evaluate_subset(products, candidate, delivery, price_map)
            if total is not None and total < best_drop_total:
                best_drop = skey
                best_drop_total = total
                best_drop_assignment = assignment

        if best_drop is not None:
            current.remove(best_drop)
            best_total = best_drop_total
            best_assignment = best_drop_assignment
            improved = True

    used_ordered = [k for k in store_keys if k in current]
    return _format(used_ordered, best_assignment, best_total, store_names)


# ── Strategy 5: greedy add heuristic (large n) ───────────────────────────────

def optimize_greedy_add(products, stores, prices):
    """Build the solution by adding stores one at a time (best marginal gain).

    Starts empty, adds the store that maximises cost reduction (or first makes
    the solution feasible). Cheap O(n²·m) — the only viable option when n
    exceeds the brute-force cap.
    """
    store_keys, store_names, delivery, price_map = _build_indexes(products, stores, prices)
    if not store_keys or not products:
        return _empty_result()

    current = set()
    best_total = None
    best_assignment = None

    while True:
        best_candidate = None
        best_candidate_total = None
        best_candidate_assignment = None

        for skey in store_keys:
            if skey in current:
                continue
            trial = current | {skey}
            total, assignment = _evaluate_subset(products, trial, delivery, price_map)
            if total is None:
                continue
            if best_candidate_total is None or total < best_candidate_total:
                best_candidate = skey
                best_candidate_total = total
                best_candidate_assignment = assignment

        if best_candidate is None:
            break

        # Accept if not yet feasible, or if adding this store strictly lowers cost.
        if best_total is None or best_candidate_total < best_total:
            current.add(best_candidate)
            best_total = best_candidate_total
            best_assignment = best_candidate_assignment
        else:
            break

    if best_assignment is None:
        return _empty_result()

    used_ordered = [k for k in store_keys if k in current]
    return _format(used_ordered, best_assignment, best_total, store_names)


# ── Dispatcher ───────────────────────────────────────────────────────────────

_STRATEGIES = {
    "brute_force":        optimize_brute_force,
    "single_store":       optimize_single_store,
    "cheapest_per_item":  optimize_cheapest_per_item,
    "greedy_consolidate": optimize_greedy_consolidate,
    "greedy_add":         optimize_greedy_add,
}


def optimize(products, stores, prices, methods=None):
    """Run one or more strategies and return them ranked by total cost.

    Response shape:
        {
          "best": {method, label, ...result},   # cheapest feasible (or empty)
          "results": [{method, label, ...result}, ...],  # all requested
          # legacy fields mirror "best" for backward compat with current UI:
          "total": ..., "stores_used": [...], "assignments": [...],
        }
    """
    labels = {m["key"]: m["label"] for m in OPTIMIZATION_METHODS}
    if not methods:
        methods = [m["key"] for m in OPTIMIZATION_METHODS]
    # Skip brute force silently when the search space is too large.
    n = len(stores)
    if n > BRUTE_FORCE_MAX_STORES:
        methods = [m for m in methods if m != "brute_force"]

    results = []
    for key in methods:
        strategy = _STRATEGIES.get(key)
        if strategy is None:
            continue
        result = strategy(products, stores, prices)
        results.append({
            "method": key,
            "label":  labels.get(key, key),
            **result,
        })

    feasible = [r for r in results if r["feasible"]]
    best = min(feasible, key=lambda r: r["total"]) if feasible else None

    legacy = {
        "total":       best["total"]       if best else 0.0,
        "stores_used": best["stores_used"] if best else [],
        "assignments": best["assignments"] if best else [],
    }
    return {
        "best":    best,
        "results": results,
        **legacy,
    }


def serialize_quotation(q):
    """Dump a quotation including nested children with their DB ids."""
    return {
        "id":         q.id,
        "name":       q.name,
        "created_at": q.created_at.isoformat() if q.created_at else None,
        "updated_at": q.updated_at.isoformat() if q.updated_at else None,
        "products": [
            {"id": p.id, "name": p.name, "quantity": p.quantity, "position": p.position}
            for p in q.products
        ],
        "stores": [
            {"id": s.id, "name": s.name, "delivery_cost": s.delivery_cost, "position": s.position}
            for s in q.stores
        ],
        "prices": [
            {"product_id": pr.product_id, "store_id": pr.store_id, "price": pr.price}
            for pr in q.prices
        ],
    }
