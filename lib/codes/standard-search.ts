"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";

export type LoincSearchRow = {
  loinc_num: string;
  component: string | null;
  property: string | null;
  time_aspect: string | null;
  system: string | null;
  scale_type: string | null;
  method_type: string | null;
  class: string | null;
  long_common_name: string | null;
  shortname: string | null;
  display_name: string | null;
  status: string | null;
  example_ucum_units: string | null;
  units_required: string | null;
};

export type UcumUnitRow = {
  code: string;
  display_name: string | null;
  common_synonym: string | null;
  unit_type: string | null;
  dimension: string | null;
  status: string | null;
};

export type IcdSearchRow = {
  code: string;
  name: string;
  category: string | null;
  status: string | null;
};

function safeSearchTerm(term: string) {
  return term.replace(/[%,]/g, " ").trim();
}

function loincDisplay(row: LoincSearchRow) {
  return row.display_name || row.long_common_name || row.shortname || row.component || row.loinc_num;
}

function loincOrderName(row: LoincSearchRow) {
  return row.shortname || row.display_name || row.component || row.long_common_name || row.loinc_num;
}

function loincOfficialName(row: LoincSearchRow) {
  return row.long_common_name || row.display_name || row.shortname || row.component || row.loinc_num;
}

export function loincToVisitDetail(row: LoincSearchRow) {
  return {
    test_name: loincOrderName(row),
    loinc_code: row.loinc_num,
    loinc_name: loincOfficialName(row),
    ucum_unit: row.example_ucum_units || "",
    ucum_name: "",
  };
}

export async function searchLoincCodes(term: string, limit = 12) {
  const raw = term.trim();
  const q = safeSearchTerm(raw);
  if (q.length < 2) return { data: [] as LoincSearchRow[], error: "" };

  const sb = supabaseBrowser();
  const select = "loinc_num,component,property,time_aspect,system,scale_type,method_type,class,long_common_name,shortname,display_name,status,example_ucum_units,units_required";

  const exact = await sb.from("loinc_codes").select(select).eq("loinc_num", raw).limit(1);
  if (exact.error) return { data: [] as LoincSearchRow[], error: exact.error.message };
  if ((exact.data || []).length > 0) return { data: exact.data as LoincSearchRow[], error: "" };

  const prefix = await sb
    .from("loinc_codes")
    .select(select)
    .or(`loinc_num.ilike.${q}%,display_name.ilike.${q}%,long_common_name.ilike.${q}%,shortname.ilike.${q}%,component.ilike.${q}%`)
    .limit(limit);

  if (prefix.error) return { data: [] as LoincSearchRow[], error: prefix.error.message };
  if ((prefix.data || []).length > 0) return { data: prefix.data as LoincSearchRow[], error: "" };

  const contains = await sb
    .from("loinc_codes")
    .select(select)
    .or(`loinc_num.ilike.%${q}%,display_name.ilike.%${q}%,long_common_name.ilike.%${q}%,shortname.ilike.%${q}%,component.ilike.%${q}%`)
    .limit(limit);

  if (contains.error) return { data: [] as LoincSearchRow[], error: contains.error.message };
  return { data: (contains.data || []) as LoincSearchRow[], error: "" };
}

export async function searchIcdCodes(term: string, limit = 12) {
  const raw = term.trim();
  const q = safeSearchTerm(raw);
  if (q.length < 2) return { data: [] as IcdSearchRow[], error: "" };

  const sb = supabaseBrowser();
  const select = "code,name,category,status";

  const exact = await sb.from("icd_codes").select(select).eq("code", raw.toUpperCase()).limit(1);
  if (exact.error) return { data: [] as IcdSearchRow[], error: exact.error.message };
  if ((exact.data || []).length > 0) return { data: exact.data as IcdSearchRow[], error: "" };

  const prefix = await sb
    .from("icd_codes")
    .select(select)
    .or(`code.ilike.${q}%,name.ilike.${q}%`)
    .limit(limit);

  if (prefix.error) return { data: [] as IcdSearchRow[], error: prefix.error.message };
  if ((prefix.data || []).length > 0) return { data: prefix.data as IcdSearchRow[], error: "" };

  const contains = await sb
    .from("icd_codes")
    .select(select)
    .or(`code.ilike.%${q}%,name.ilike.%${q}%`)
    .limit(limit);

  if (contains.error) return { data: [] as IcdSearchRow[], error: contains.error.message };
  return { data: (contains.data || []) as IcdSearchRow[], error: "" };
}

export async function searchUcumUnits(term: string, limit = 12) {
  const raw = term.trim();
  const q = safeSearchTerm(raw);
  if (!raw) return { data: [] as UcumUnitRow[], error: "" };

  const sb = supabaseBrowser();
  const select = "code,display_name,common_synonym,unit_type,dimension,status";

  const exact = await sb.from("ucum_units").select(select).eq("code", raw).limit(1);
  if (exact.error) return { data: [] as UcumUnitRow[], error: exact.error.message };
  if ((exact.data || []).length > 0) return { data: exact.data as UcumUnitRow[], error: "" };
  if (q.length < 2) return { data: [] as UcumUnitRow[], error: "" };

  const results = await sb
    .from("ucum_units")
    .select(select)
    .or(`code.ilike.%${q}%,display_name.ilike.%${q}%,common_synonym.ilike.%${q}%,unit_type.ilike.%${q}%`)
    .limit(limit);

  if (results.error) return { data: [] as UcumUnitRow[], error: results.error.message };
  return { data: (results.data || []) as UcumUnitRow[], error: "" };
}
