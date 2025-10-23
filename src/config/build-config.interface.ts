import { AppConfig } from './app-config.interface';
import { StatisticsConfig } from './statistics-config';
import { UniversalConfig } from './universal-config.interface';

export interface BuildConfig extends AppConfig {
  universal: UniversalConfig;
  statistics: StatisticsConfig;
}
