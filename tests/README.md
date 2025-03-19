# Testing keyv-dataloader

This directory contains tests for the `keyv-dataloader` package. Tests cover various scenarios with Redis storage adapter.

## Test Structure

- **redis.test.ts**: Tests with Redis storage adapter
- **error-handling.test.ts**: Tests for error handling and edge cases

## Running Tests

### Redis Tests

Run the Redis tests:

```bash
pnpm test:redis
```

This requires Redis to be running on localhost:6379.

### All Tests with Docker

To run all tests with Redis, use the Docker setup:

```bash
# Start Docker containers, run tests, then stop containers
pnpm test:docker
```

This requires Docker and Docker Compose to be installed on your system.

### Other Test Commands

```bash
# Run all tests
pnpm test

# Watch mode (auto-rerun on file changes)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

## Docker Setup

The `docker-compose.yml` file in the root directory sets up the required Redis container for testing. You can start it manually with:

```bash
docker-compose up -d
```

And shut it down with:

```bash
docker-compose down
```

## Test Configuration

- Tests use Jest as the test runner
- TypeScript tests are compiled using ts-jest
- Configuration is in `jest.config.js` at the project root

## Coverage Reporting

Coverage reports are generated in the `coverage` directory when running:

```bash
pnpm test:coverage
```
