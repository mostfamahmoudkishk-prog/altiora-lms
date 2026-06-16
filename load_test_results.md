# Altiora Database Concurrency Load Test Results

Generated on: ١٤‏/٦‏/٢٠٢٦، ٥:٠٣:٥٣ ص

## Summary Table

| Concurrency (Users) | Total Duration (s) | Mean Latency (ms) | P50 Latency (ms) | P95 Latency (ms) | P99 Latency (ms) | Memory Change (MB) | CPU Time (s) | Slow Queries (>50ms) |
| ------------------- | ------------------ | ----------------- | ---------------- | ---------------- | ---------------- | ------------------ | ------------ | -------------------- |
| 100                 | 15.73s             | 15185.7ms         | 15225.7ms        | 15643.4ms        | 15699.5ms        | 7.05 MB            | 1.00s        | 700                  |
| 500                 | 50.23s             | 47849.3ms         | 47862.2ms        | 49871.7ms        | 50043.0ms        | 21.60 MB           | 2.59s        | 3500                 |
| 1000                | 69.64s             | 64963.5ms         | 65039.8ms        | 69039.8ms        | 69381.3ms        | -12.71 MB          | 2.66s        | 7000                 |

## Slow Queries Profiles

### Concurrency: 100 Users

Listed slow queries:

- `login_read_user`: **427.1ms**
- `login_read_user`: **609.5ms**
- `login_read_user`: **1026.7ms**
- `login_read_user`: **1661.0ms**
- `login_read_user`: **1946.0ms**
- `login_read_user`: **2002.7ms**
- `login_read_user`: **2016.3ms**
- `login_read_user`: **2024.0ms**
- `login_read_user`: **2027.7ms**
- `login_read_user`: **2041.1ms**

### Concurrency: 500 Users

Listed slow queries:

- `login_read_user`: **343.9ms**
- `login_read_user`: **350.1ms**
- `login_read_user`: **349.8ms**
- `login_read_user`: **353.4ms**
- `login_read_user`: **351.7ms**
- `login_read_user`: **352.6ms**
- `login_read_user`: **413.4ms**
- `login_read_user`: **424.0ms**
- `login_read_user`: **422.5ms**
- `login_read_user`: **508.0ms**

### Concurrency: 1000 Users

Listed slow queries:

- `login_read_user`: **370.3ms**
- `login_read_user`: **370.7ms**
- `login_read_user`: **372.1ms**
- `login_read_user`: **372.8ms**
- `login_read_user`: **372.9ms**
- `login_read_user`: **377.3ms**
- `login_read_user`: **378.5ms**
- `login_read_user`: **377.2ms**
- `login_read_user`: **377.1ms**
- `login_read_user`: **523.2ms**
