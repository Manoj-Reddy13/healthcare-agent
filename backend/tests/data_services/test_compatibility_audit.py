from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
import unittest
from scripts.compatibility_audit import audit

class CompatibilityTests(unittest.TestCase):
    def test_missing_fields_are_reported_without_fabrication(self):
        report=audit()
        self.assertFalse(report['safe_to_switch_existing_client'])
        self.assertEqual(len(report['hospital_contract_checks']),2)
        for item in report['hospital_contract_checks']:
            self.assertFalse(item['compatible'])
            self.assertTrue({'rating','distance_km','data_mode'}<={e['field'] for e in item['issues']})
    def test_unavailable_cost_requires_contract_change(self):
        report=audit()
        self.assertFalse(report['unavailable_cost_compatible'])
        self.assertIn('average_cost',{e['field'] for e in report['unavailable_cost_issues']})

if __name__=='__main__':unittest.main(verbosity=2)
