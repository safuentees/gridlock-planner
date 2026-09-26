#!/usr/bin/env python3
"""Rebuild the public report catalog and forecast-readiness assessment.

Reads only the two bundled PDFs; preserves their planned dates and contradictions.
No model is trained and no locations are invented. Run with --check for a read-only
reproducibility check. Dependencies are in scripts/requirements.txt.
"""
from pathlib import Path
import argparse
import collections
import datetime
import hashlib
import json
import re

from pypdf import PdfReader
import pdfplumber


def require(condition, message):
    if not condition:
        raise ValueError(message)


def date_argument(value):
    try:
        return datetime.date.fromisoformat(value).isoformat()
    except ValueError as exc:
        raise argparse.ArgumentTypeError("Use YYYY-MM-DD for --as-of") from exc


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo-root', type=Path, default=Path(__file__).resolve().parents[1],
                        help='GridLock repository root; defaults to the script’s parent repository.')
    parser.add_argument('--as-of', type=date_argument, default='2026-09-26',
                        help='Review date used only for past-planned-date counts (default:2026-09-26).')
    parser.add_argument('--check', action='store_true',
                        help='Compare regenerated JSON with existing outputs without writing.')
    args=parser.parse_args()
    repo=args.repo_root.resolve()
    GPC=repo/'public/sources/Georgia_Power_2025_IRP_Volume_3_PUBLIC_DISCLOSURE.pdf'
    DESC=repo/'public/sources/Dominion_2024-2028_Project_Descriptions.pdf'
    require(GPC.is_file() and DESC.is_file(), 'The two bundled source PDFs are required under public/sources/.')
    outputs={
        'full_report_catalog.json':repo/'public/data/full_report_catalog.json',
        'forecast_assessment.json':repo/'src/data/forecast_assessment.json',
    }
    def flat(s): return re.sub(r'\s+',' ',s or '').strip()
    def pages(path):
        return {n: page.extract_text() or '' for n, page in enumerate(PdfReader(path).pages, start=1)}
    def iso(s):
        fmt='%m/%d/%Y' if len(s.split('/')[-1])==4 else '%m/%d/%y'
        return datetime.datetime.strptime(s,fmt).date().isoformat()
    def metadata_date(path, key):
        raw=(PdfReader(path).metadata or {}).get(key, '')
        match=re.match(r'D:(\d{4})(\d{2})(\d{2})', str(raw))
        return '-'.join(match.groups()) if match else None

    def save(name,value):
        path=outputs[name]
        content=json.dumps(value,indent=2,ensure_ascii=False)+'\n'
        if args.check:
            require(path.is_file() and path.read_text(encoding='utf-8')==content,
                    f'{path.relative_to(repo)} is missing or stale; run without --check.')
        else:
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_text(content,encoding='utf-8')

    gpages=pages(GPC)
    dpages=pages(DESC)
    require(len(gpages)==668 and len(dpages)==44, 'Unexpected source PDF page counts.')
    require('December 2024' in flat(gpages[4]), 'Expected December 2024 snapshot declaration not found.')
    source_meta={
     'desc_supplied': {'file':str(DESC.relative_to(repo)),'url':'/sources/'+DESC.name,'sha256':hashlib.sha256(DESC.read_bytes()).hexdigest(),'pdf_pages':44,'plan_horizon':'2024–2028 budget','snapshot_count':1,'publication_date':None,'pdf_created':metadata_date(DESC,'/CreationDate'),'date_note':'PDF creation metadata is not a verified publication or information-cutoff date.'},
     'gpc_supplied': {'file':str(GPC.relative_to(repo)),'url':'/sources/'+GPC.name,'sha256':hashlib.sha256(GPC.read_bytes()).hexdigest(),'pdf_pages':668,'plan_horizon':'2025–2034 transmission plan; 2024–2028 distribution forecast','snapshot_count':1,'snapshot_as_of':'2024-12','snapshot_precision':'month','snapshot_evidence_pdf_page':4,'pdf_created':metadata_date(GPC,'/CreationDate'),'pdf_modified':metadata_date(GPC,'/ModDate'),'date_note':'Foreword gives December 2024 snapshot. Metadata dates describe the file, not extra historical observations.'}
    }

    def field(t,a,b):
        m=re.search(re.escape(a)+r'\s*(.*?)\s*'+re.escape(b),t,re.S)
        return flat(m[1]) if m else None

    desc=[]
    for n,t in sorted(dpages.items()):
        raw_dates=field(t,'Planned In-Service Date','Estimated Project Cost')
        dlist=re.findall(r'(\d{1,2}/\d{1,2}/\d{2,4})(?:\s*\((phase\s+\d+)\))?',raw_dates)
        pid=field(t,'Project ID','Project Description')
        desc.append({'record_key':f'DESC:{pid}','source_project_id':pid,'name':field(t,'5 Year Budget','Project ID'),'report_utility':'Dominion Energy South Carolina','sponsor_code':'DESC','source_id':'desc_supplied','source_pdf_page':n,'source_status':field(t,'Project Status','Planned In-Service Date'),'description':field(t,'Project Description','Project Need'),'project_need':field(t,'Project Need','Project Status'),'planned_milestones':[{'value':iso(d),'precision':'day','meaning':'planned_in_service_date','phase':phase or None} for d,phase in dlist],'raw_date_field':raw_dates,'actual_start':None,'actual_end':None,'geometry':None,'quality_flags':['multiple_phases_one_project'] if len(dlist)>1 else []})

    summary={}
    for n in range(177,191):
        for m in re.finditer(r'(?m)^\s*(\d{3})\s+(20\d{2})\s+(\d{4,5})\s+(.+?)(\d{1,2}/\d{1,2}/\d{4})\s+(GPC|GTC|MEAG|SAV|DU)\s+REDACTED',gpages[n],re.S):
            zone,year,pid,name,need,sponsor=m.groups()
            require(pid not in summary, f'Duplicate active summary TEAMS ID {pid}')
            summary[pid]={'record_key':f'GA_ITS:{pid}','teams_id':pid,'name':flat(name),'planning_zone':zone,'year':int(year),'sponsor_code':sponsor,'source_id':'gpc_supplied','summary_pdf_page':n,'summary_need_date':iso(need),'summary_need_date_raw':need,'actual_start':None,'actual_end':None,'geometry':None,'quality_flags':[]}
    gpc=[]
    for n,t in sorted(gpages.items()):
        m=re.search(r'Teams\s*#\s*(\d+)',t,re.I)
        d=re.search(r'Need Date\s+(\d+/\d+/\d+)\s+Start Date\s+(\d+/\d+/\d+)',t)
        if not(m and d): continue
        r=dict(summary[m[1]])
        r['detail_pdf_page']=n
        r['detail_need_date']=iso(d[1]);r['detail_need_date_raw']=d[1]
        r['planned_implementation_start']=iso(d[2]);r['planned_implementation_start_raw']=d[2]
        r['date_meanings']={'need_date':'expected required in-service / readiness milestone; not actual completion','start_date':'planning lead-time schedule for implementation; not a verified actual construction start'}
        body=re.search(r'\* The ITS Assigned designation is for parity forecast purposes only\s*(.*?)\s*PUBLIC DISCLOSURE',t,re.S)
        body=body[1].strip() if body else ''
        if not body and m[1]=='09662':
            special=re.search(r'Estimated Cost [–-] GTC\s+REDACTED\s*(.*?)\s*PUBLIC DISCLOSURE',t,re.S)
            body=special[1].strip() if special else ''
            r['detail_continuation_pdf_pages']=[302]
            r['quality_flags'].append('multi_sponsor_components_under_one_id')
        parts=body.split('REDACTED',1)
        r['description']=flat(parts[0]) or None
        r['public_change_notes']=flat(parts[1]) if len(parts)>1 else None
        r['linked_previous_teams_ids']=re.findall(r'(?:previously listed under|Previously listed under)\s+TEAMS\s*#\s*(\d+)',body,re.I)
        r['sponsor_group']='GPC_or_SAV_coded' if r['sponsor_code'] in ('GPC','SAV') else 'other_ITS_sponsor'
        r['ownership_caution']='Sponsor code is preserved from the joint ITS plan; it is not independently verified legal ownership of every component.'
        if r['summary_need_date']!=r['detail_need_date']:
            r['quality_flags'].append('summary_detail_need_date_conflict')
            r['selected_need_date']=None
        else:r['selected_need_date']=r['detail_need_date']
        if r['planned_implementation_start']>r['detail_need_date']:r['quality_flags'].append('planned_start_after_need_date')
        if not r['description']:r['quality_flags'].append('description_not_extracted')
        gpc.append(r)

    cancelled=[]
    for m in re.finditer(r'(?m)^\s*(\d{3})\s+(\d{4,5})\s+(.+?)(\d{1,2}/\d{1,2}/\d{4})\s+(GPC|GTC|MEAG|SAV|DU)\s+REDACTED',gpages[191],re.S):
        zone,pid,name,d,sponsor=m.groups()
        cancelled.append({'record_key':f'GA_ITS:{pid}','teams_id':pid,'name':flat(name),'planning_zone':zone,'sponsor_code':sponsor,'source_id':'gpc_supplied','source_pdf_page':191,'reported_status':'cancelled_or_removed_from_current_plan','last_year_need_date':iso(d),'actual_end':None,'status_caution':'Removed status does not prove abandoned underlying work; aliases/successors may exist.'})
    completed=[]
    for m in re.finditer(r'(?m)^\s*(\d{3})\s+(\d{4,5})\s+(.+?)\s+(\d{1,2}/\d{1,2}/\d{4})\s*$',gpages[192]):
        zone,pid,name,d=m.groups()
        completed.append({'record_key':f'GA_ITS:{pid}','teams_id':pid,'name':flat(name),'planning_zone':zone,'source_id':'gpc_supplied','source_pdf_page':192,'reported_status':'removed_due_to_in_service_or_construction_completion','last_year_need_date':iso(d),'actual_start':None,'actual_end':None,'date_caution':'Last Year’s Need Date is NOT an actual completion date.'})

    distribution=[]
    with pdfplumber.open(GPC) as pdf:
        for n in range(558,564):
            tables=[table for table in pdf.pages[n-1].extract_tables() if table and table[0][0]=='PROJECT NAME']
            require(len(tables)==1, f'Expected one distribution table on PDF page {n}; found {len(tables)}')
            for i,row in enumerate(tables[0][1:],start=1):
                name,description,date,*_=row
                distribution.append({'record_key':f'GPC_DISTRIBUTION:page{n}:row{i}','record_key_meaning':'source row locator, not a stable utility project ID','source_project_id':None,'name':flat(name),'description':flat(description),'source_id':'gpc_supplied','source_pdf_page':n,'source_table_row':i,'need_date':iso(flat(date)),'need_date_raw':flat(date),'date_meaning':'planned need date; actual completion unconfirmed','actual_start':None,'actual_end':None,'geometry':None,'cross_section_identity_review_required':True})

    require(len(desc)==44 and len({r['source_project_id'] for r in desc})==44, 'DESC record/unique-ID count must be44.')
    require(len(gpc)==208 and len({r['teams_id'] for r in gpc})==208, 'Active Georgia record/unique-ID count must be208.')
    require({r['teams_id'] for r in gpc}==set(summary), 'Active summary/detail IDs do not join1:1.')
    require(len(cancelled)==10 and len(completed)==13 and len(distribution)==77, 'Removed/completed/distribution counts differ from supplied reports.')
    active_ids={r['teams_id'] for r in gpc};removed_ids={r['teams_id'] for r in cancelled+completed}
    active_removed_overlap=sorted(active_ids & removed_ids)
    for r in gpc:
        if r['teams_id'] in active_removed_overlap:r['quality_flags'].append('also_listed_in_cancelled_removed_table')

    catalog={'schema_version':1,'scope':'Extracted public supplied planning-report inventory; not a mapped dataset or training dataset of actual work.','sources':source_meta,'desc_transmission':desc,'georgia_its_active_transmission':gpc,'georgia_its_completed_removals':completed,'georgia_its_cancelled_removals':cancelled,'gpc_distribution_forecast_rows':distribution,'identity_rules':['Full composite DESC project IDs remain intact; do not collapse parent-number prefixes or count each phase as an independent job.','Join Georgia active summary/detail by TEAMS ID; keep conflicts and both source pages.','Treat successive plan versions and detailed budget/component/task pages as observations of the same project, not extra jobs.','Distribution records lack stable project IDs; do not combine their row count with transmission count as independent jobs without entity resolution.','Descriptions can contain other TEAMS references; only the page’s own Teams # identifies the project.'],'restricted_data_policy':'Only visible public fields extracted. Redacted costs/supporting statements and restricted model data were not reconstructed.'}

    mismatch=[{'teams_id':r['teams_id'],'name':r['name'],'summary_pdf_page':r['summary_pdf_page'],'summary_need_date':r['summary_need_date'],'detail_pdf_page':r['detail_pdf_page'],'detail_need_date':r['detail_need_date']} for r in gpc if 'summary_detail_need_date_conflict' in r['quality_flags']]
    anomalies=[{'teams_id':r['teams_id'],'pdf_page':r['detail_pdf_page'],'need_date':r['detail_need_date'],'planned_start':r['planned_implementation_start']} for r in gpc if 'planned_start_after_need_date' in r['quality_flags']]
    assessment={
     'schema_version':1,'review_date':args.as_of,'sources':source_meta,
     'headline':'More planning inventory is extractable, but these supplied snapshots do not support a validated probability forecast of future construction co-occurrence.',
     'coverage':{
      'desc':{'pdf_pages':44,'source_project_records':44,'unique_full_project_ids':44,'status_counts':dict(collections.Counter(r['source_status'] for r in desc)),'planned_milestones':sum(len(r['planned_milestones']) for r in desc),'multi_phase_project_count':1,'multi_phase_evidence':{'project_id':'6859','pdf_page':34,'milestones':['2025-10-01','2026-10-01']},'date_span':[min(m['value'] for r in desc for m in r['planned_milestones']),max(m['value'] for r in desc for m in r['planned_milestones'])],'confirmed_actual_start_end_pairs':0,'snapshot_count':1,'selection_limit':'Only projects above the stated $2M budget threshold; not all construction jobs.'},
      'georgia_its_active':{'pdf_pages_in_report':668,'summary_pdf_pages':[177,190],'detail_pdf_pages':[214,425],'unique_teams_ids':208,'summary_appearances':208,'detail_appearances':208,'duplicate_display_appearances_removed':208,'sponsor_counts':dict(collections.Counter(r['sponsor_code'] for r in gpc)),'gpc_plus_sav_coded_count':138,'other_its_sponsor_count':70,'date_span':[min(r['detail_need_date'] for r in gpc),max(r['detail_need_date'] for r in gpc)],'need_year_counts':dict(sorted(collections.Counter(r['detail_need_date'][:4] for r in gpc).items())),'confirmed_actual_start_end_pairs':0,'snapshot_count':1},
      'georgia_its_removed':{'completed_status_count':13,'completed_pdf_page':192,'cancelled_or_removed_count':10,'cancelled_pdf_page':191,'unique_removed_ids':23,'exact_actual_completion_dates':0,'active_removed_id_conflicts':active_removed_overlap,'unique_teams_ids_across_active_and_removed_lists':len(active_ids|removed_ids),'date_field':'Last Year’s Need Date','independence_note':'These are a one-snapshot status list, not 13 observed completion times or a complete prior-year cohort. One removed ID12016 is linked by a current project note as a predecessor.'},
      'gpc_distribution':{'row_count':77,'pdf_pages':[558,563],'rows_by_pdf_page':{'558':13,'559':14,'560':14,'561':14,'562':13,'563':9},'stable_project_ids':0,'exact_actual_completion_dates':0,'date_span':[min(r['need_date'] for r in distribution),max(r['need_date'] for r in distribution)],'identity_note':'Keep separate; names/sites may relate to transmission projects or distinct work at the same location.'},
      'canonical_transmission_inventory_records':252,'canonical_transmission_inventory_note':'44 DESC records plus 208 active Georgia ITS IDs. This count does not mean 252 independently sampled jobs or actual outcome observations.',
      'extracted_catalog_coordinate_count':0,'mapped_initial_workbook_examples':10,'geography_note':'The additional catalog has names/zones/descriptions but no validated coordinates extracted here. Do not invent locations from names or map unmapped records to zero.',
      'independent_longitudinal_training_series':0,'complete_two_utility_actual_construction_interval_pairs':0
     },
     'date_semantics':[
      {'report':'DESC','field':'Planned In-Service Date','meaning':'planned readiness/operation milestone, sometimes phase-specific','actual':False,'evidence_pdf_pages':[1,34]},
      {'report':'Georgia ITS','field':'Need Date','meaning':'expected required in-service date','actual':False,'evidence_pdf_page':213},
      {'report':'Georgia ITS','field':'Start Date','meaning':'planned implementation lead time needed to meet expected in-service date; not verified actual field construction','actual':False,'evidence_pdf_page':213},
      {'report':'Georgia ITS completed list','field':'Last Year’s Need Date','meaning':'previous planned date associated with removed/completed-status record','actual':False,'evidence_pdf_page':192}
     ],
     'quality_findings':{'active_removed_id_conflicts':[{'teams_id':'20482','active_summary_pdf_page':184,'active_detail_pdf_page':332,'active_need_date':'2028-06-01','removed_table_pdf_page':191,'removed_last_year_need_date':'2031-06-01','resolution':'Unresolved source conflict; preserve both statements.'}],'summary_detail_date_conflicts':mismatch,'planned_start_after_need':anomalies,'description_extraction_missing_count':sum(r['description'] is None for r in gpc),'retiming_notes_present':'Current pages include changes against previous plans, not independently frozen earlier snapshots. Do not treat these retrospective comments as information known at an earlier prediction origin.','known_previous_id_links':[{'current_teams_id':r['teams_id'],'previous_teams_ids':r['linked_previous_teams_ids'],'pdf_page':r['detail_pdf_page']} for r in gpc if r['linked_previous_teams_ids']],'repeated_appendix_example':{'teams_id':'20466','meaning':'SMART VALVE INSTALLATION','project_item_ids':['2046601','2046604','2046605','2046606','2046607'],'note':'Budget/task/item pages revisit one active project. They are not independent jobs or repeated actual outcomes.'},'redacted_problem_reports':{'explanation_pdf_page':652,'redaction_pages':[654,656],'note':'Do not infer extra training observations from restricted case-model versions or reconstruct redactions.'}},
     'prediction_assessment':{
      'ideal_target':'At prediction cutoff t, estimate for each fixed geographic cell and future calendar quarter whether at least two distinct projects from different utilities will have actual field-construction intervals overlapping inside the declared distance radius.',
      'needed_labels':['stable project and component identity','geometry known as of prediction cutoff','actual construction start/end dates or independently verified activity observations','dated frozen plan snapshots and their publication cutoffs','representative coverage including projects that did not overlap, delays, cancellations and new projects'],
      'available_labels':'13 Georgia completed-status flags, zero exact actual completion times and zero validated cross-utility construction-overlap intervals; one supplied plan snapshot per reporting system.',
      'credible_forecast_feasible':False,
      'why':['A past planned need date is not an observed construction time.','Different planned years inside one plan are forecast horizons, not independently observed historical years.','One-snapshot completed status lists lack a full prior cohort and exact event dates.','Random splitting summary/detail rows or project phases would leak identity.','Using need-date years as a time split would leak the same late planning snapshot into alleged earlier training.','Selection differs by report: DESC has a $2M threshold; Georgia ITS covers multiple sponsors; distribution rows have no stable IDs.','Most additional records lack validated geographic coordinates.'],
      'possible_future_evaluation':'With genuine archived as-of snapshots and later outcomes, use rolling prediction cutoffs; train only on information available before each cutoff, group related project IDs/phases across splits, reserve later quarters as untouched evaluation, and compare to persistence/seasonal count baselines. Score count errors and rare-event calibration only when actual labels and coverage support them.',
      'honest_alternative_target':'A deterministic count of currently supplied planning milestones that fall within a selected calendar window after explicit user-defined schedule shifts; this is a scenario, not a forecast.',
      'model_training_performed':False,'probabilities_or_accuracy_claims_permitted':False
     },
     'recommended_ui_panel':{'title':'What the full reports support','metrics':['44 DESC project records','208 distinct active Georgia ITS IDs: 138 GPC/SAV-coded, 70 other sponsor codes','77 additional distribution rows without stable project IDs','13 completed-status records, 0 exact completion dates','1 supplied plan snapshot per report'],'conclusion':'Scenario exploration is available. Validated future construction probabilities are not supported by these inputs.'},
     'qa':{'count_assertions_passed':True,'summary_detail_id_join':'208 of 208 matched; zero unmatched','source_pages_visually_checked':[{'report':'DESC','page':34},{'report':'Georgia','page':192},{'report':'Georgia','page':366},{'report':'Georgia','page':558}],'additional_original_sample_visual_checks':'Five Georgia sample description pages previously inspected in full; all remain referenced in prior review.','costs_excluded':True,'original_sources_modified':False}
    }
    require(all(r['description'] for r in gpc), 'Some active descriptions were not extracted.')
    require(len(active_ids|removed_ids)==230 and active_removed_overlap==['20482'], 'Unexpected active/removed identity relationship.')
    require({r['teams_id'] for r in gpc if 'summary_detail_need_date_conflict' in r['quality_flags']}=={'19523','20684','17900'}, 'Known date conflicts changed; review sources.')
    require({r['teams_id'] for r in gpc if 'planned_start_after_need_date' in r['quality_flags']}=={'20248'}, 'Known chronology anomaly changed; review sources.')
    require(sum(len(r['planned_milestones']) for r in desc)==45, 'DESC phase milestones must total45 across44 projects.')
    require(all(r['geometry'] is None for r in desc+gpc+distribution), 'Unlocated report rows must stay off the map.')
    assessment['qa']['native_pdf_date_fields_checked']=2*len(gpc)
    assessment['qa']['rebuild_command']='python scripts/extract_reports.py'
    assessment['qa']['check_command']='python scripts/extract_reports.py --check'
    assessment['qa']['manual_visual_review_date']='2026-09-26'
    assessment['coverage']['georgia_its_active']['planned_need_dates_before_review_date']=sum(r['detail_need_date']<args.as_of for r in gpc)
    assessment['coverage']['georgia_its_active']['past_date_caution']='Dates in the past relative to the review date remain planned milestones from one snapshot, not actual historical events.'
    assessment['coverage']['desc']['project_records_with_any_planned_milestone_before_review_date']=sum(any(m['value']<args.as_of for m in r['planned_milestones']) for r in desc)
    assessment['scenario_implementation']={'kind':'deterministic','schedule_shift_unit':'whole calendar years','shift_source':'explicit user assumptions by company','date_basis':'original supplied planned milestones','original_dates_preserved':True,'probabilities':False,'construction_overlap_inferred':False,'geography':'Only the separately mapped ten workbook examples; full-report records remain unlocated.'}
    save('full_report_catalog.json',catalog)
    save('forecast_assessment.json',assessment)
    print(json.dumps({'files':['full_report_catalog.json','forecast_assessment.json'],'desc':len(desc),'ga_active':len(gpc),'completed':len(completed),'cancelled':len(cancelled),'distribution':len(distribution),'missing_descriptions':assessment['quality_findings']['description_extraction_missing_count'],'quality_conflicts':len(mismatch)},indent=2))


if __name__ == "__main__":
    main()
