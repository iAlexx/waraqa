import * as migration_20260718_052746_phase_3_core_collections from './20260718_052746_phase_3_core_collections';
import * as migration_20260718_163635_phase_3_site_settings from './20260718_163635_phase_3_site_settings';
import * as migration_20260718_234422_phase_4_editorial_workflow from './20260718_234422_phase_4_editorial_workflow';
import * as migration_20260719_034836_phase_5_site_settings_public_fields from './20260719_034836_phase_5_site_settings_public_fields';
import * as migration_20260719_083000_phase_6_search_text from './20260719_083000_phase_6_search_text';
import * as migration_20260720_041000_phase_8_interactive_guide from './20260720_041000_phase_8_interactive_guide';

export const migrations = [
  {
    up: migration_20260718_052746_phase_3_core_collections.up,
    down: migration_20260718_052746_phase_3_core_collections.down,
    name: '20260718_052746_phase_3_core_collections',
  },
  {
    up: migration_20260718_163635_phase_3_site_settings.up,
    down: migration_20260718_163635_phase_3_site_settings.down,
    name: '20260718_163635_phase_3_site_settings',
  },
  {
    up: migration_20260718_234422_phase_4_editorial_workflow.up,
    down: migration_20260718_234422_phase_4_editorial_workflow.down,
    name: '20260718_234422_phase_4_editorial_workflow',
  },
  {
    up: migration_20260719_034836_phase_5_site_settings_public_fields.up,
    down: migration_20260719_034836_phase_5_site_settings_public_fields.down,
    name: '20260719_034836_phase_5_site_settings_public_fields',
  },
  {
    up: migration_20260719_083000_phase_6_search_text.up,
    down: migration_20260719_083000_phase_6_search_text.down,
    name: '20260719_083000_phase_6_search_text',
  },
  {
    up: migration_20260720_041000_phase_8_interactive_guide.up,
    down: migration_20260720_041000_phase_8_interactive_guide.down,
    name: '20260720_041000_phase_8_interactive_guide',
  },
]
