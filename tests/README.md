# Testing keyv-dataloader

This directory contains tests for the `keyv-dataloader` package. Tests cover various scenarios including in-memory, Redis, and Memcached storage adapters.

## Test Structure

- **memory.test.ts**: Tests with the default in-memory store
- **redis.test.ts**: Tests with Redis storage adapter
- **memcached.test.ts**: Tests with Memcached storage adapter
- **error-handling.test.ts**: Tests for error handling and edge cases

## Running Tests

### In-Memory Tests

Run the in-memory tests (no external dependencies required):

```bash
pnpm test:memory
```

### All Tests with Docker

To run all tests including Redis and Memcached tests, use the Docker setup:

```bash
# Start Docker containers, run tests, then stop containers
pnpm test:docker
```

This requires Docker and Docker Compose to be installed on your system.

### Running Individual Test Suites

```bash
# Run Redis tests only
pnpm test:redis

# Run Memcached tests only
pnpm test:memcached
```

### Other Test Commands

```bash
# Run all tests
pnpm test

# Watch mode (auto-rerun on file changes)
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

## Docker Setup

The project includes a `docker-compose.yml` file that sets up:

1. Redis server on port 6379
2. Memcached server on port 11211

You can manually start these containers with:

```bash
docker-compose up -d
```

And stop them with:

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
