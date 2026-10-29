from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
import copy
import unittest
from app.services.eligibility_rules import match_scheme

def policy():
    return {'scheme_id':'synthetic-only','release_status':'reviewed','source_url':'https://example.org/synthetic','source_locator':'Test only','reviewer':'Synthetic fixture','valid_from':'2026-01-01','valid_to':'2027-01-01','refresh_by':'2026-12-01','rule':{'operator':'AND','rules':[{'attribute':'state','operator':'eq','value':'TS'},{'operator':'OR','rules':[{'attribute':'age','operator':'gte','value':70},{'attribute':'listed','operator':'eq','value':True}]}]}}

class SchemeTests(unittest.TestCase):
    def match(self,answers,**changes):
        p=policy();p.update(changes);return match_scheme(p,answers,'2026-10-29')
    def test_or_path_passes_without_irrelevant_answer(self):
        result=self.match({'state':'TS','age':72})
        self.assertEqual(result['status'],'potentially_applicable');self.assertEqual(result['missing_fields'],[])
    def test_missing_answer_is_unknown(self):
        result=self.match({'state':'TS','age':60})
        self.assertEqual(result['status'],'needs_information');self.assertEqual(result['missing_fields'],['listed'])
    def test_failed_and_dominates_unknown(self):
        self.assertEqual(self.match({'state':'KA'})['status'],'not_applicable')
    def test_wrong_type_does_not_become_pass(self):
        self.assertEqual(self.match({'state':'TS','age':'72','listed':False})['status'],'needs_information')
    def test_boolean_not_numeric_age(self):
        self.assertEqual(self.match({'state':'TS','age':True,'listed':False})['status'],'needs_information')
    def test_expired_and_unreviewed_not_used(self):
        self.assertEqual(self.match({},refresh_by='2026-01-01')['status'],'needs_information')
        self.assertEqual(self.match({},release_status='draft')['status'],'needs_information')
    def test_no_sensitive_answers_in_result(self):
        answers={'state':'TS','age':72,'personal_id':'secret-fixture'};before=copy.deepcopy(answers)
        self.assertNotIn('secret-fixture',str(self.match(answers)));self.assertEqual(answers,before)
    def test_bad_operator_rejected(self):
        with self.assertRaises(ValueError):self.match({},rule={'operator':'eval','attribute':'x','value':1})
    def test_empty_group_rejected(self):
        with self.assertRaises(ValueError):self.match({},rule={'operator':'AND','rules':[]})

if __name__=='__main__':unittest.main(verbosity=2)
