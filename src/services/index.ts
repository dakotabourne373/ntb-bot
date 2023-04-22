export { CommandRegistrationService } from './command-registration-service.js';
export { EventDataService } from './event-data-service.js';
export { HttpService } from './http-service.js';
export { JobService } from './job-service.js';
export { Lang } from './lang.js';
export { Logger } from './logger.js';
export { MasterApiService } from './master-api-service.js';
export { ConfigService } from './config-service.js';
import { VoiceService } from './voice-service.js';

export const voiceServiceInstance = new VoiceService();
export { VoiceService };
