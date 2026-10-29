from app.healthcare_paths import BACKEND_ROOT, DATA_ROOT, SCHEMA_PATH
"""Member 3 eligibility rule evaluation. No policies or personal answers persisted."""
from datetime import date
from app.services.data_store import require

def validate_node(node,depth=0):
    require(isinstance(node,dict) and depth<20,'Invalid or excessive rule nesting')
    if node.get('operator') in ('AND','OR'):
        require(isinstance(node.get('rules'),list) and bool(node['rules']),'Rule group must contain children')
        for child in node['rules']:validate_node(child,depth+1)
    else:
        require(node.get('operator') in ('eq','gte','lte','in'),'Unsupported rule operator')
        require(isinstance(node.get('attribute'),str) and bool(node['attribute'].strip()),'Rule attribute required')
        require('value' in node and node['value'] is not None,'Rule value required')
        value=node['value']
        if node['operator'] in ('gte','lte'):
            require(type(value) in (int,float) and float('-inf')<value<float('inf'),'Numeric rule value required')
        elif node['operator']=='in':
            require(isinstance(value,list) and bool(value) and all(type(v) in (str,int,bool) for v in value),'Membership values required')
        else:require(type(value) in (str,int,bool),'Unsupported equality value')

def evaluate_node(node,answers):
    op=node['operator']
    if op in ('AND','OR'):
        children=[evaluate_node(n,answers) for n in node['rules']]
        states=[x['state'] for x in children]
        if op=='AND':state='fail' if 'fail' in states else ('unknown' if 'unknown' in states else 'pass')
        else:state='pass' if 'pass' in states else ('unknown' if 'unknown' in states else 'fail')
        return {'state':state,'operator':op,'children':children}
    key=node['attribute'];actual=answers.get(key);expected=node['value']
    if actual is None:return {'state':'unknown','attribute':key,'reason':'missing'}
    if op in ('gte','lte'):
        if type(actual) not in (int,float) or not float('-inf')<actual<float('inf'):
            return {'state':'unknown','attribute':key,'reason':'invalid_type'}
        passed=actual>=expected if op=='gte' else actual<=expected
    elif op=='in':passed=any(type(actual) is type(v) and actual==v for v in expected)
    else:
        if type(actual) is not type(expected):return {'state':'unknown','attribute':key,'reason':'invalid_type'}
        passed=actual==expected
    # Do not echo sensitive answer values into traces.
    return {'state':'pass' if passed else 'fail','attribute':key}

def match_scheme(policy,answers,on_date):
    today=date.fromisoformat(on_date)
    require(isinstance(answers,dict),'Answers must be a mapping')
    if policy.get('release_status')!='reviewed':
        return {'status':'needs_information','reason':'Policy is not reviewed','missing_fields':[]}
    require(all(isinstance(policy.get(k),str) and bool(policy[k].strip()) for k in ('scheme_id','source_url','source_locator','reviewer')),'Missing policy provenance')
    if not(date.fromisoformat(policy['valid_from'])<=today<date.fromisoformat(policy['valid_to'])) or today>date.fromisoformat(policy['refresh_by']):
        return {'status':'needs_information','reason':'Policy evidence not current','missing_fields':[]}
    validate_node(policy['rule'])
    trace=evaluate_node(policy['rule'],answers)
    missing=set()
    def visit(node):
        if node.get('reason') in ('missing','invalid_type'):missing.add(node['attribute'])
        for child in node.get('children',[]):visit(child)
    visit(trace)
    return {'scheme_id':policy['scheme_id'],'status':{'pass':'potentially_applicable','fail':'not_applicable','unknown':'needs_information'}[trace['state']],
            'missing_fields':sorted(missing) if trace['state']=='unknown' else [],'trace':trace,
            'source_url':policy['source_url'],'source_locator':policy['source_locator'],
            'notice':'Rule screening only. Enrollment, treatment coverage and hospital participation require separate confirmation.'}
