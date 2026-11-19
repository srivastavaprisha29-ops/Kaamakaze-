'use strict';

const $ = selector => document.querySelector(selector);
const fields = {
  name: ['Name', 'Resume heading'],
  contact: ['Contact', 'Contact line'],
  education: ['Education', 'Education section'],
  experience: ['Experience', 'Experience bullets'],
  projects: ['Projects', 'Project highlights'],
  skills: ['Skills', 'Role-relevant skills'],
  notes: ['Notes for Kai', 'Additional evidence for matching sections']
};
const storageKey = 'kaamakaze-workspace-v1';
const empty = { profile: {}, resumes: [], jobs: [] };
let data;
try {
  data = JSON.parse(localStorage.getItem(storageKey)) || empty;
} catch {
  data = empty;
}
let online = false;
let activeResume;
let activeJob;
let toastTimer;

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function toast(message) {
  $('#toast').textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').textContent = ''; }, 4500);
}

function commit(next) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    toast('This browser could not save your changes. Free up storage and try again.');
    return false;
  }
  data = next;
  render();
  return true;
}

function values(form) {
  return Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, value.trim()]));
}

function fill(form, record = {}) {
  form.reset();
  for (const [key, value] of Object.entries(record)) {
    const control = form.elements.namedItem(key);
    if (control) control.value = value;
  }
}

function action(label, handler) {
  const button = element('button', label, 'outline');
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}

function renderFolders() {
  const list = $('#folder-list');
  const query = $('#folder-search').value.trim().toLowerCase();
  const filter = $('#folder-filter').value;
  const total = data.resumes.length;
  const matching = new Set(data.resumes.filter(resume =>
    (filter === 'all' || Boolean(resume.revision) === (filter === 'revision')) &&
    [resume.role, resume.company].some(value => value?.toLowerCase().includes(query))
  ).map(resume => resume.id));
  const label = total === 1 ? ' resume' : ' resumes';
  $('#folder-count').textContent = (matching.size === total ? total : matching.size + ' of ' + total) + label;
  $('#archive-tools').hidden = !total;
  list.replaceChildren();
  if (!data.resumes.length) {
    const folder = element('article', undefined, 'folder');
    const body = element('div', undefined, 'folder-body');
    const copy = element('div');
    copy.append(element('h3', 'Your first resume goes here'), element('p', 'Each version you generate gets its own folder.'));
    const link = element('a', 'Start with Kai ↗', 'outline');
    link.href = '#kai';
    body.append(copy, link);
    folder.append(element('div', 'RESUME FOLDER', 'folder-tab'), body);
    list.append(folder);
  } else if (!matching.size) {
    list.append(element('p', 'No resumes match your search and filter.', 'empty'));
  }
  for (const [index, resume] of data.resumes.entries()) {
    if (!matching.has(resume.id)) continue;
    const folder = element('article', undefined, 'folder');
    folder.dataset.color = (data.resumes.length - index - 1) % 3;
    const body = element('div', undefined, 'folder-body');
    const copy = element('div');
    const preview = element('div', undefined, 'folder-preview');
    preview.setAttribute('aria-hidden', 'true');
    const sheet = element('div', undefined, 'folder-sheet');
    const excerpt = resume.body.split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(0, 6);
    for (const line of excerpt) sheet.append(element('span', line));
    preview.append(sheet);
    const date = new Date(resume.created).toLocaleDateString(undefined, { dateStyle: 'medium' });
    copy.append(element('h3', resume.role), element('p', [resume.company, resume.revision ? 'Revision' : '', resume.mode, date].filter(Boolean).join(' · ')),
      action('Open resume ↗', () => openResume(resume)));
    body.append(copy, preview);
    folder.append(element('div', 'RESUME ' + String(data.resumes.length - index).padStart(2, '0'), 'folder-tab'), body);
    list.append(folder);
  }
}

function render() {
  const name = data.profile.name?.split(/\s+/)[0];
  $('#welcome-name').textContent = name ? ', ' + name : '';
  renderFolders();
  const offers = data.jobs.filter(job => ['Offer received', 'Offer accepted'].includes(job.status));
  $('#stats').replaceChildren();
  for (const [label, count] of [['Tracked', data.jobs.length], ['Offers', offers.length], ['Accepted', offers.filter(job => job.status === 'Offer accepted').length]]) {
    const card = element('div');
    card.append(element('strong', count), element('span', label));
    $('#stats').append(card);
  }
  $('#job-list').replaceChildren();
  if (!data.jobs.length) $('#job-list').append(element('p', 'Add a job to track its timeline and outcome.', 'empty'));
  const jobs = [...data.jobs].sort((a, b) => Number(offers.includes(b)) - Number(offers.includes(a)));
  for (const job of jobs) {
    const row = element('article', undefined, 'job');
    const copy = element('div');
    const dates = [job.applied && 'Applied ' + job.applied, job.outcome && 'Outcome ' + job.outcome];
    const resume = data.resumes.find(item => item.id === job.resumeId);
    copy.append(element('h3', job.role), element('p', [job.company, job.status, ...dates].filter(Boolean).join(' · ')));
    if (resume) copy.append(action('Open resume used ↗', () => openResume(resume)));
    if (job.timeline) copy.append(element('p', job.timeline));
    row.append(copy, action('Edit →', () => openJob(job)));
    $('#job-list').append(row);
  }
}

function showMap(show) {
  $('#details-tab').setAttribute('aria-pressed', !show);
  $('#map-tab').setAttribute('aria-pressed', show);
  $('#profile-form').hidden = show;
  const map = $('#profile-map');
  map.hidden = !show;
  if (!show) return;
  const tree = element('div', undefined, 'map');
  for (const [key, [label, use]] of Object.entries(fields)) {
    if (!data.profile[key]) continue;
    const node = element('article');
    const count = data.resumes.filter(resume => resume.sources.includes(key)).length;
    node.append(element('strong', label), element('p', data.profile[key]), element('small', '→ ' + use + (count ? ' · Used in ' + count + (count === 1 ? ' resume' : ' resumes') : '')));
    tree.append(node);
  }
  map.replaceChildren(element('strong', data.profile.name || 'Your profile'), element('p', 'See how each part of your profile can feed into a resume.'));
  map.append(tree.childElementCount ? tree : element('p', 'Save profile details to build your experience map.'));
}

function openResume(resume) {
  const dialog = $('#resume-dialog');
  const form = $('#resume-form');
  if (dialog.open && activeResume !== resume.id) {
    const current = data.resumes.find(item => item.id === activeResume);
    if (form.elements.body.value !== current.body && !window.confirm('Discard unsaved edits and open the other version?')) return;
  }
  activeResume = resume.id;
  $('#resume-title').textContent = resume.role;
  fill(form, resume);
  const labels = resume.sources.map(key => fields[key]?.[0]).filter(Boolean);
  const details = $('#resume-sources');
  details.replaceChildren();
  if (labels.length) details.append(element('p', 'Profile sections used: ' + labels.join(', ')));
  const parent = data.resumes.find(item => item.id === resume.previousId);
  if (parent) details.append(action('Open previous version ↗', () => openResume(parent)));
  const next = data.resumes.filter(item => item.previousId === resume.id);
  for (const version of next) {
    const date = new Date(version.created).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    details.append(action('Open revision · ' + date + ' ↗', () => openResume(version)));
  }
  if (!dialog.open) dialog.showModal();
  else form.elements.body.focus();
}

function openJob(job) {
  activeJob = job?.id;
  $('#job-title').textContent = job ? 'Edit application' : 'Add job';
  const select = $('#job-form').elements.resumeId;
  select.replaceChildren(new Option('Choose a saved resume', ''));
  for (const resume of data.resumes) {
    const date = new Date(resume.created).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    const label = [resume.role, resume.company, resume.revision && 'Revision', date].filter(Boolean).join(' · ');
    select.add(new Option(label, resume.id));
  }
  fill($('#job-form'), job);
  updateFeedback();
  $('#revision-status').textContent = '';
  $('#job-dialog').showModal();
}

function updateFeedback() {
  $('#feedback-fields').hidden = $('#job-form').elements.status.value !== 'Closed without offer';
}

function localDraft(profile, target) {
  const words = new Set((target.role + ' ' + target.description).toLowerCase().match(/[a-z0-9+#.]{3,}/g) || []);
  const sections = ['experience', 'projects', 'skills', 'education', 'notes'];
  const sources = ['name', 'contact'].filter(key => profile[key]);
  const content = sources.map(key => profile[key]);
  for (const key of sections) {
    if (!profile[key]) continue;
    const lines = profile[key].split(/\n/).map(line => line.trim()).filter(Boolean);
    const score = line => (line.toLowerCase().match(/[a-z0-9+#.]{3,}/g) || []).filter(word => words.has(word)).length;
    if (key === 'skills') lines.sort((a, b) => score(b) - score(a));
    content.push('', (key === 'notes' ? 'ADDITIONAL BACKGROUND' : fields[key][0].toUpperCase()), ...lines);
    sources.push(key);
  }
  return { body: content.join('\n').trim(), sources, mode: 'Local draft' };
}

async function generate(payload, status, button) {
  button.disabled = true;
  status.textContent = 'Working on your resume…';
  try {
    if (!online) {
      if (payload.previous) throw new Error('Feedback-based rewrites require a connected Kai AI server.');
      return localDraft(payload.profile, payload);
    }
    const response = await fetch('api/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Kai could not generate a resume.');
    return { ...result, mode: 'Kai AI' };
  } catch (error) {
    status.textContent = error.name === 'TimeoutError' ? 'Kai took too long. Try again.' : error.message;
    return null;
  } finally {
    button.disabled = false;
  }
}

function hasBackground(profile) {
  return ['education', 'experience', 'projects', 'skills', 'notes'].some(key => profile[key]);
}

function newResume(result, target, revision = false) {
  return { ...result, role: target.role, company: target.company, description: target.description, revision, id: crypto.randomUUID(), created: Date.now() };
}

$('#profile-open').onclick = () => {
  fill($('#profile-form'), data.profile);
  showMap(false);
  $('#profile-dialog').showModal();
};
$('#details-tab').onclick = () => showMap(false);
$('#map-tab').onclick = () => showMap(true);
$('#folder-search').oninput = renderFolders;
$('#folder-filter').onchange = renderFolders;
$('#profile-form').onsubmit = event => {
  event.preventDefault();
  if (commit({ ...data, profile: values(event.target) })) toast('Profile saved.');
};
document.querySelectorAll('[data-close]').forEach(button => {
  button.onclick = () => button.closest('dialog').close();
});

$('#kai-form').onsubmit = async event => {
  event.preventDefault();
  const form = event.target;
  const { notes, ...target } = values(form);
  const status = $('#kai-status');
  if (!target.role || !target.description) {
    status.textContent = 'Enter a role and a job description.';
    return;
  }
  const profile = { ...data.profile };
  if (notes) {
    profile.notes = [profile.notes, notes].filter(Boolean).join('\n\n');
    if (profile.notes.length > 30000) {
      status.textContent = 'Your profile notes are full. Shorten them in Profile before adding more.';
      return;
    }
    if (!commit({ ...data, profile })) return;
    form.elements.notes.value = '';
  }
  if (!hasBackground(profile)) {
    status.textContent = 'Add profile notes or save your background in Profile first.';
    return;
  }
  const result = await generate({ ...target, profile }, status, event.submitter);
  if (!result) return;
  const resume = newResume(result, target);
  if (!commit({ ...data, resumes: [resume, ...data.resumes] })) {
    status.textContent = 'The generated resume could not be saved.';
    return;
  }
  status.textContent = 'Saved to your folders.';
  openResume(resume);
};

$('#resume-form').onsubmit = event => {
  event.preventDefault();
  const { body } = values(event.target);
  if (!body) return toast('Enter some resume text before saving.');
  const resumes = data.resumes.map(item => item.id === activeResume ? { ...item, body } : item);
  if (commit({ ...data, resumes })) toast('Resume changes saved.');
};
$('#download').onclick = () => {
  const role = data.resumes.find(item => item.id === activeResume).role;
  const text = $('#resume-form').elements.body.value;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = element('a');
  link.href = url;
  link.download = (role.replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '') || 'resume') + '.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('#print').onclick = () => {
  $('#print-copy').textContent = $('#resume-form').elements.body.value;
  window.print();
};

$('#job-open').onclick = () => openJob();
$('#job-form').elements.status.onchange = updateFeedback;
function jobFromForm(form, id) {
  const job = { ...values(form), id: id || crypto.randomUUID() };
  if (!job.role || !job.company) {
    toast('Enter both the role and the company.');
    return null;
  }
  return job;
}
function updatedJobs(job) {
  return data.jobs.some(item => item.id === job.id)
    ? data.jobs.map(item => item.id === job.id ? job : item)
    : [job, ...data.jobs];
}
$('#job-form').onsubmit = event => {
  event.preventDefault();
  const job = jobFromForm(event.target, activeJob);
  if (job && commit({ ...data, jobs: updatedJobs(job) })) {
    $('#job-dialog').close();
    toast('Application saved.');
  }
};
$('#revise').onclick = async event => {
  const form = $('#job-form');
  if (!form.reportValidity()) return;
  const job = jobFromForm(form, activeJob);
  if (!job) return;
  const status = $('#revision-status');
  const old = data.resumes.find(item => item.id === job.resumeId);
  if (!old) {
    status.textContent = 'Choose the resume used for this application.';
    return;
  }
  if (!commit({ ...data, jobs: updatedJobs(job) })) return;
  activeJob = job.id;
  const target = { role: job.role, company: job.company, description: old.description };
  const result = await generate({ ...target, profile: data.profile, previous: old.body, feedback: job.feedback }, status, event.target);
  if (!result) return;
  const resume = newResume(result, target, true);
  resume.previousId = old.id;
  if (!commit({ ...data, resumes: [resume, ...data.resumes] })) {
    status.textContent = 'The revised resume could not be saved.';
    return;
  }
  if ($('#job-dialog').open && activeJob === job.id) {
    $('#job-dialog').close();
    openResume(resume);
  }
  toast('Revision saved in a new folder.');
};

render();
fetch('api/status', { signal: AbortSignal.timeout(4000) })
  .then(response => response.ok ? response.json() : null)
  .then(result => { online = result?.ai === true; })
  .catch(() => {})
  .finally(() => {
    $('#mode').textContent = online ? 'Kai AI connected · Sends resume inputs to the AI provider' : 'Local draft mode · AI connection required for rewrites';
  });
