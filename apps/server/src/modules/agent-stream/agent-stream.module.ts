import { Module } from '@nestjs/common';

import { AgentProducer } from './agent-producer.port.js';
import { AgentStreamController } from './agent-stream.controller.js';
import { AgentStreamService } from './agent-stream.service.js';
import { RunCoordinatorService } from './run-coordinator.service.js';
import { RunEventStreamService } from './run-event-stream.service.js';
import { SimulatedAgentProducerService } from './simulated-agent-producer.service.js';

@Module({
  controllers: [AgentStreamController],
  providers: [
    AgentStreamService,
    RunCoordinatorService,
    RunEventStreamService,
    {
      provide: AgentProducer,
      useClass: SimulatedAgentProducerService,
    },
  ],
})
export class AgentStreamModule {}
