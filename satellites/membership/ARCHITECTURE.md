# membership Satellite Architecture

This satellite follows the Gravito Satellite Specification v1.0.

## Design
- **DDD**: Domain logic is separated from framework concerns.
- **Dogfooding**: Uses official Gravito modules (@gravito/atlas, @gravito/stasis).
- **Decoupled**: Inter-satellite communication happens via Contracts and Events.

## Layers
- **Domain**: Pure business rules.
- **Application**: Orchestration of domain tasks.
- **Infrastructure**: Implementation of persistence and external services.
- **Interface**: HTTP and Event entry points.
