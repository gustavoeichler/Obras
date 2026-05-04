FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*
RUN pip install --upgrade pip
COPY . .
RUN pip install --no-cache-dir -e .

EXPOSE 5000

CMD ["python", "run.py"]