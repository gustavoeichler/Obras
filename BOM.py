import sys
import pandas as pd
from PyQt6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QPushButton,
    QTableWidget, QTableWidgetItem, QHBoxLayout, QLabel,
    QLineEdit, QInputDialog, QFileDialog, QMessageBox
)
from PyQt6.QtGui import QColor, QGuiApplication


class BOMApp(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("BOM Optimizer")
        self.resize(1200, 650)

        self.layout = QVBoxLayout()

        # Buttons
        btn_layout = QHBoxLayout()
        self.add_product_btn = QPushButton("Add Product")
        self.delete_product_btn = QPushButton("Delete Product")
        self.add_store_btn = QPushButton("Add Store")
        self.delete_store_btn = QPushButton("Delete Store")
        self.calculate_btn = QPushButton("Calculate")
        self.copy_btn = QPushButton("Copy Table")
        self.import_btn = QPushButton("Import Excel")
        self.export_btn = QPushButton("Export Excel")
        self.export_plan_btn = QPushButton("Export Optimal Plan")

        for b in [
            self.add_product_btn, self.delete_product_btn,
            self.add_store_btn, self.delete_store_btn,
            self.calculate_btn, self.copy_btn,
            self.import_btn, self.export_btn,
            self.export_plan_btn
        ]:
            btn_layout.addWidget(b)

        self.layout.addLayout(btn_layout)

        # Table
        self.table = QTableWidget()
        self.table.setColumnCount(3)
        self.table.setHorizontalHeaderLabels(
            ["Produto", "Quantidade", "Melhor Preço"]
        )
        self.layout.addWidget(self.table)

        # Delivery
        self.delivery_layout = QVBoxLayout()
        self.delivery_inputs = {}
        self.layout.addLayout(self.delivery_layout)

        self.total_label = QLabel("")
        self.layout.addWidget(self.total_label)

        self.setLayout(self.layout)

        # State
        self.optimal_assignment = []
        self.optimal_total = 0

        # Events
        self.add_product_btn.clicked.connect(self.add_product)
        self.delete_product_btn.clicked.connect(self.delete_product)
        self.add_store_btn.clicked.connect(self.add_store)
        self.delete_store_btn.clicked.connect(self.delete_store)
        self.calculate_btn.clicked.connect(self.calculate)
        self.copy_btn.clicked.connect(self.copy_table)
        self.import_btn.clicked.connect(self.import_excel)
        self.export_btn.clicked.connect(self.export_excel)
        self.export_plan_btn.clicked.connect(self.export_optimal_plan)

    # -------------------------
    def add_product(self):
        row = self.table.rowCount()
        self.table.insertRow(row)
        self.table.setItem(row, 0, QTableWidgetItem(f"Produto {row+1}"))
        self.table.setItem(row, 1, QTableWidgetItem("1"))

    def delete_product(self):
        row = self.table.currentRow()
        if row >= 0:
            self.table.removeRow(row)

    def add_store(self):
        text, ok = QInputDialog.getText(self, "Store Name", "Enter store name:")
        if not ok or not text.strip():
            return

        store_name = text.strip()
        if store_name in self.delivery_inputs:
            return

        col = self.table.columnCount()
        self.table.insertColumn(col - 1)
        self.table.setHorizontalHeaderItem(col - 1, QTableWidgetItem(store_name))

        layout = QHBoxLayout()
        label = QLabel(f"{store_name} Delivery:")
        input_field = QLineEdit("0")

        layout.addWidget(label)
        layout.addWidget(input_field)
        self.delivery_layout.addLayout(layout)

        self.delivery_inputs[store_name] = (layout, input_field)

    def delete_store(self):
        col = self.table.currentColumn()

        if col < 2 or col == self.table.columnCount() - 1:
            QMessageBox.warning(self, "Error", "Select a valid store column.")
            return

        store_name = self.table.horizontalHeaderItem(col).text()
        self.table.removeColumn(col)

        if store_name in self.delivery_inputs:
            layout, _ = self.delivery_inputs[store_name]
            while layout.count():
                item = layout.takeAt(0)
                if item.widget():
                    item.widget().deleteLater()
            self.delivery_layout.removeItem(layout)
            del self.delivery_inputs[store_name]

    # -------------------------
    def calculate(self):
        best_total, best_stores, assignment = self.optimize_multi_store()

        self.optimal_assignment = assignment
        self.optimal_total = best_total

        # Reset colors
        for row in range(self.table.rowCount()):
            for col in range(2, self.table.columnCount() - 1):
                item = self.table.item(row, col)
                if item:
                    item.setBackground(QColor("white"))

        # Highlight optimal choices
        for row, col in assignment:
            item = self.table.item(row, col)
            if item:
                item.setBackground(QColor(144, 238, 144))

        self.total_label.setText(
            f"Optimal Total Cost: R$ {best_total:.2f}\n"
            f"Stores Used: {', '.join(best_stores)}"
        )

    # -------------------------
    def optimize_multi_store(self):
        row_count = self.table.rowCount()
        col_count = self.table.columnCount()

        store_names = [
            self.table.horizontalHeaderItem(col).text()
            for col in range(2, col_count - 1)
        ]

        n = len(store_names)

        prices, quantities = [], []

        for row in range(row_count):
            try:
                q = float(self.table.item(row, 1).text().replace(",", "."))
            except:
                q = 1
            quantities.append(q)

            row_prices = []
            for col in range(2, col_count - 1):
                item = self.table.item(row, col)
                try:
                    row_prices.append(float(item.text().replace(",", ".")))
                except:
                    row_prices.append(None)
            prices.append(row_prices)

        delivery = []
        for store in store_names:
            try:
                _, input_field = self.delivery_inputs[store]
                delivery.append(float(input_field.text().replace(",", ".")))
            except:
                delivery.append(0)

        best_total = float("inf")
        best_subset, best_assignment = None, None

        for mask in range(1, 1 << n):
            subset_total = sum(delivery[i] for i in range(n) if mask & (1 << i))
            assignment = []
            valid = True

            for p in range(row_count):
                min_price, chosen = float("inf"), None

                for s in range(n):
                    if mask & (1 << s) and prices[p][s] is not None:
                        cost = prices[p][s] #* quantities[p]
                        if cost < min_price:
                            min_price, chosen = cost, s

                if chosen is None:
                    valid = False
                    break

                subset_total += min_price
                assignment.append((p, chosen + 2))

            if valid and subset_total < best_total:
                best_total, best_subset, best_assignment = subset_total, mask, assignment

        selected_stores = [
            store_names[i] for i in range(n)
            if best_subset and (best_subset & (1 << i))
        ]

        return best_total, selected_stores, best_assignment or []

    # -------------------------
    def copy_table(self):
        rows, cols = self.table.rowCount(), self.table.columnCount()

        headers = [self.table.horizontalHeaderItem(c).text() for c in range(cols)]
        text = "\t".join(headers) + "\n"

        for r in range(rows):
            row_data = []
            for c in range(cols):
                item = self.table.item(r, c)
                row_data.append(item.text() if item else "")
            text += "\t".join(row_data) + "\n"

        QGuiApplication.clipboard().setText(text)

    # -------------------------
    def export_excel(self):
        path, _ = QFileDialog.getSaveFileName(self, "Save", "", "Excel (*.xlsx)")
        if not path:
            return

        rows, cols = self.table.rowCount(), self.table.columnCount()
        headers = [self.table.horizontalHeaderItem(c).text() for c in range(cols)]

        data = []
        for r in range(rows):
            data.append([
                self.table.item(r, c).text() if self.table.item(r, c) else ""
                for c in range(cols)
            ])

        pd.DataFrame(data, columns=headers).to_excel(path, index=False)

    # -------------------------
    def import_excel(self):
        path, _ = QFileDialog.getOpenFileName(self, "Open", "", "Excel (*.xlsx)")
        if not path:
            return

        df = pd.read_excel(path)

        self.table.setRowCount(0)
        self.table.setColumnCount(len(df.columns))
        self.table.setHorizontalHeaderLabels(df.columns.tolist())

        # reset delivery
        self.delivery_inputs.clear()
        while self.delivery_layout.count():
            item = self.delivery_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        # rebuild stores
        for col in df.columns[2:-1]:
            layout = QHBoxLayout()
            label = QLabel(f"{col} Delivery:")
            input_field = QLineEdit("0")
            layout.addWidget(label)
            layout.addWidget(input_field)
            self.delivery_layout.addLayout(layout)
            self.delivery_inputs[col] = (layout, input_field)

        for i, row in df.iterrows():
            self.table.insertRow(i)
            for j, val in enumerate(row):
                self.table.setItem(i, j, QTableWidgetItem(str(val)))

    # -------------------------
    def export_optimal_plan(self):
        if not self.optimal_assignment:
            return

        path, _ = QFileDialog.getSaveFileName(self, "Save Plan", "", "Excel (*.xlsx)")
        if not path:
            return

        data = []

        for row, col in self.optimal_assignment:
            product = self.table.item(row, 0).text()
            quantity = self.table.item(row, 1).text()
            store = self.table.horizontalHeaderItem(col).text()
            price = float(self.table.item(row, col).text())
            total = price

            data.append([product, quantity, store, price, total])

        df = pd.DataFrame(data, columns=[
            "Produto", "Quantidade", "Loja", "Preço Unitário", "Total"
        ])

        summary = pd.DataFrame([["TOTAL", "", "", "", self.optimal_total]], columns=df.columns)
        df = pd.concat([df, summary], ignore_index=True)

        df.to_excel(path, index=False)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = BOMApp()
    window.show()
    sys.exit(app.exec())