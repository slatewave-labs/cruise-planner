# Unit Tests

> Last updated: 2026-02-19

Unit tests for backend modules using **pytest**.

## Test Files

| File | What It Tests |
|------|---------------|
| `test_affiliate_config.py` | Affiliate link URL generation and configuration |
| `test_llm_client.py` | Groq LLM client (prompt building, response parsing) |
| `test_models.py` | Data model validation |
| `test_ports_data.py` | Port search and coordinate lookup |

## Running Tests

```bash
cd /path/to/cruise-planner
python -m pytest tests/unit/ -v
```

## Writing New Tests

Tests mock external dependencies (DynamoDB, Groq API) using `unittest.mock`. See existing test files for patterns.
