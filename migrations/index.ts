import * as migration_20260718_052746_phase_3_core_collections from './20260718_052746_phase_3_core_collections';
import * as migration_20260718_163635_phase_3_site_settings from './20260718_163635_phase_3_site_settings';

export const migrations = [
  {
    up: migration_20260718_052746_phase_3_core_collections.up,
    down: migration_20260718_052746_phase_3_core_collections.down,
    name: '20260718_052746_phase_3_core_collections',
  },
  {
    up: migration_20260718_163635_phase_3_site_settings.up,
    down: migration_20260718_163635_phase_3_site_settings.down,
    name: '20260718_163635_phase_3_site_settings'
  },
];
