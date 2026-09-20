// CSV parsing for the hiring importers.
//
// Deliberately small and dependency-free. The sheets are pasted or saved out
// of Excel/Google Sheets, so the only cases that matter are quoted fields
// containing commas, escaped quotes, and CRLF line endings.

// Split one CSV line, honouring "quoted, fields" and "" escapes.
const splitLine = (line) => {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i += 1; } else { inQuotes = false; }
      } else { cur += ch; }
    } else if (ch === '"') { inQuotes = true; } else if (ch === ',') { out.push(cur); cur = ''; } else { cur += ch; }
  }
  out.push(cur);
  return out.map((v) => v.trim());
};

// Parse a CSV string into { headers, rows } where each row is an object keyed
// by the normalised header. Blank lines are skipped — the sample sheets have
// runs of them between records.
export const parseCsv = (text) => {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim() !== '');
  if (!lines.length) return { headers: [], rows: [] };
  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
    return obj;
  });
  return { headers, rows };
};

// Header text → the field name the API expects. Matching is
// case/space/punctuation-insensitive so "Contact No.", "contact no" and
// "CONTACT_NO" all land on `phone`.
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

const CANDIDATE_MAP = {
  dateofcontact: 'contacted_on',
  positionappliedfor: 'position',
  position: 'position',
  name: 'name',
  contactno: 'phone',
  contactnumber: 'phone',
  phone: 'phone',
  emailid: 'email',
  email: 'email',
  location: 'location',
  highestqualification: 'highest_qualification',
  qualification: 'highest_qualification',
  stream: 'stream',
  workexperience: 'experience_level',
  experience: 'experience_level',
  currentlocationwitharea: 'current_area',
  currentlocation: 'current_area',
  currentsalary: 'current_salary',
  expectedsalary: 'expected_salary',
  noticeperiod: 'notice_period',
  interviewdate: 'interview_date',
  // The real sheet's header is "Interview Done ( Yes/No" — unclosed bracket
  // and all. norm() strips punctuation, so this matches it and the tidier
  // variants without anyone having to fix the spreadsheet first.
  interviewdone: 'status',
  interviewdoneyesno: 'status',
  status: 'status',
  remark: 'remark',
  remarks: 'remark',
  '1stremark': 'remark',
  '2ndremark': 'remark_2',
};

const INTERVIEW_MAP = {
  srno: '_ignore',
  position: 'position',
  positionappliedfor: 'position',
  name: 'name',
  contactno: 'phone',
  contactnumber: 'phone',
  phone: 'phone',
  interviewdate: 'interview_date',
  interviewtime: 'interview_time',
  interviewmode: 'mode',
  mode: 'mode',
  interviewstatus: 'status',
  status: 'status',
  '1stremark': 'remark_1',
  '2ndremark': 'remark_2',
  remark: 'remark_1',
};

// Map parsed CSV rows onto the API's field names. Unrecognised columns are
// dropped rather than passed through — the server rejects unknown keys and a
// stray "Sr. No" column should not fail an otherwise good import.
export const mapRows = (rows, kind) => {
  const map = kind === 'interview' ? INTERVIEW_MAP : CANDIDATE_MAP;
  return rows.map((r) => {
    const out = {};
    for (const [header, value] of Object.entries(r)) {
      const field = map[norm(header)];
      if (field && field !== '_ignore') out[field] = value;
    }
    return out;
  }).filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''));
};

// Which headers were not understood — surfaced in the UI so a misnamed column
// is visible before import rather than silently ignored.
export const unmappedHeaders = (headers, kind) => {
  const map = kind === 'interview' ? INTERVIEW_MAP : CANDIDATE_MAP;
  return headers.filter((h) => h.trim() !== '' && !map[norm(h)]);
};
