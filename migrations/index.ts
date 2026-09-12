import * as migration_20260718_052746_phase_3_core_collections from './20260718_052746_phase_3_core_collections';
import * as migration_20260718_163635_phase_3_site_settings from './20260718_163635_phase_3_site_settings';
import * as migration_20260718_234422_phase_4_editorial_workflow from './20260718_234422_phase_4_editorial_workflow';
import * as migration_20260719_034836_phase_5_site_settings_public_fields from './20260719_034836_phase_5_site_settings_public_fields';
import * as migration_20260719_083000_phase_6_search_text from './20260719_083000_phase_6_search_text';
import * as migration_20260720_041000_phase_8_interactive_guide from './20260720_041000_phase_8_interactive_guide';
import * as migration_20260721_051000_p0_05a_claims_foundation from './20260721_051000_p0_05a_claims_foundation';
import * as migration_20260721_120000_p0_05b1_claim_trust_publication from './20260721_120000_p0_05b1_claim_trust_publication';
import * as migration_20260722_100000_p0_06_content_class_isolation from './20260722_100000_p0_06_content_class_isolation';
import * as migration_20260912_220000_phase_10_user_reports from './20260912_220000_phase_10_user_reports';

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
  {
    up: migration_20260721_051000_p0_05a_claims_foundation.up,
    down: migration_20260721_051000_p0_05a_claims_foundation.down,
    name: '20260721_051000_p0_05a_claims_foundation',
  },
  {
    up: migration_20260721_120000_p0_05b1_claim_trust_publication.up,
    down: migration_20260721_120000_p0_05b1_claim_trust_publication.down,
    name: '20260721_120000_p0_05b1_claim_trust_publication',
  },
  {
    up: migration_20260722_100000_p0_06_content_class_isolation.up,
    down: migration_20260722_100000_p0_06_content_class_isolation.down,
    name: '20260722_100000_p0_06_content_class_isolation',
  },
  {
    up: migration_20260912_220000_phase_10_user_reports.up,
    down: migration_20260912_220000_phase_10_user_reports.down,
    name: '20260912_220000_phase_10_user_reports',
  },
]
