/**
 * A non-UI path into the vault, for humans and for agents without MCP. Every
 * command goes through the same store layer as the app — schema validation,
 * snapshot, atomic write, conflict check — so nothing here can corrupt a file
 * that the interface would have protected.
 */
import { installNetGuard } from '../src/lib/net-guard.js';
installNetGuard();

import { getVault } from '../src/lib/vault/index.js';
import { addTask, setTaskStatus } from '../src/lib/vault/tasks.js';
import {
  addTimeEntry,
  formatHours,
  parseHours,
  sumHours,
  allTimeEntries,
} from '../src/lib/vault/time.js';
import { createNote } from '../src/lib/vault/notes.js';
import { progressOf } from '../src/lib/vault/projects.js';
import { today } from '../src/lib/dates.js';

const [command, ...args] = process.argv.slice(2);

function usage(): never {
  console.log(`Usage: npm run vault -- <command>

  people                          list the roster
  tasks [open|done|all]           list tasks
  task-add <title> [--due YYYY-MM-DD] [--person slug] [--project id] [--priority urgent|important|normal]
  task-done <id>
  notes [--person slug] [--project id]
  note-add <title> [--person slug] [--project id] [--category 1on1|feedback|incident|planning|idea|generic]
  projects [active|archived|all]  list projects and how far their phases have got
  hours                           show the balance
  hours-add <+/-h> [reason] [--date YYYY-MM-DD]
  search <text>                   search notes, tasks and people
  problems                        anything the app cannot read`);
  process.exit(args.length ? 1 : 0);
}

function flag(name: string): string | null {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? (args[at + 1] ?? null) : null;
}

/** Positional words, with --flag pairs removed. */
function positional(): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i]!.startsWith('--')) {
      i++;
      continue;
    }
    out.push(args[i]!);
  }
  return out;
}

switch (command) {
  case 'people': {
    for (const p of getVault().people) {
      console.log(`${p.slug.padEnd(22)} ${p.displayName.padEnd(22)} ${p.hr.jobTitle ?? ''}`);
    }
    break;
  }

  case 'projects': {
    const which = positional()[0] ?? 'active';
    const vault = getVault();
    const projects = vault.projects.filter((p) =>
      which === 'all' ? true : which === 'archived' ? p.archived : !p.archived,
    );
    for (const p of projects) {
      const { total, done, percent } = progressOf(p, vault.tasks);
      const phases = total ? `${done}/${total} phases ${percent}%` : 'no phases';
      const open = vault.tasks.filter((t) => t.projectId === p.id && t.status !== 'done').length;
      const notes = vault.notesByProject.get(p.id)?.length ?? 0;
      console.log(
        `${p.archived ? 'A' : ' '} ${p.id.padEnd(28)} ${phases.padEnd(20)} ${open} open, ${notes} ${notes === 1 ? 'note' : 'notes'}`,
      );
      console.log(`    ${p.title}`);
    }
    if (projects.length === 0) console.log('(none)');
    break;
  }

  case 'tasks': {
    const which = positional()[0] ?? 'open';
    const tasks = getVault().tasks.filter((t) =>
      which === 'all' ? true : which === 'done' ? t.status === 'done' : t.status !== 'done',
    );
    for (const t of tasks) {
      const mark = t.status === 'done' ? '✓' : ' ';
      console.log(
        `${mark} ${t.priority.padEnd(9)} ${(t.dueDate ?? '—').padEnd(10)} ${t.title}` +
          (t.personSlug ? `  (${t.personSlug})` : '') +
          (t.projectId ? `  [${t.projectId}]` : ''),
      );
      console.log(`    ${t.id}`);
    }
    if (tasks.length === 0) console.log('(none)');
    break;
  }

  case 'task-add': {
    const title = positional().join(' ');
    if (!title) usage();
    const priority = (flag('priority') ?? 'normal') as 'urgent' | 'important' | 'normal';
    await addTask({
      title,
      priority,
      dueDate: flag('due'),
      personSlug: flag('person'),
      projectId: flag('project'),
    });
    console.log('Added.');
    break;
  }

  case 'task-done': {
    const id = positional()[0];
    if (!id) usage();
    await setTaskStatus(id, true);
    console.log('Done.');
    break;
  }

  case 'notes': {
    const person = flag('person');
    const project = flag('project');
    const notes = getVault()
      .notes.filter((n) => !person || n.personSlug === person)
      .filter((n) => !project || n.project === project);
    for (const n of notes) {
      console.log(
        `${(n.date ?? '—').padEnd(11)} ${n.category.padEnd(9)}${n.draft ? ' draft' : '      '} ${n.title}` +
          (n.project ? `  [${n.project}]` : ''),
      );
      console.log(`    ${n.path}`);
    }
    if (notes.length === 0) console.log('(none)');
    break;
  }

  case 'note-add': {
    const title = positional().join(' ');
    if (!title) usage();
    const path = await createNote({
      title,
      personSlug: flag('person'),
      project: flag('project'),
      category: (flag('category') ?? 'generic') as never,
    });
    console.log(path);
    break;
  }

  case 'hours': {
    const entries = allTimeEntries();
    console.log(`Balance ${formatHours(sumHours(entries))} across ${entries.length} entries.`);
    for (const e of entries.slice(0, 10)) {
      console.log(`  ${e.date}  ${formatHours(e.hoursDelta).padStart(7)}  ${e.note}`);
    }
    break;
  }

  case 'hours-add': {
    const words = positional();
    if (!words[0]) usage();
    await addTimeEntry(flag('date') ?? today(), parseHours(words[0]), words.slice(1).join(' '));
    console.log('Logged.');
    break;
  }

  case 'search': {
    const needle = positional().join(' ').toLowerCase();
    if (!needle) usage();
    const vault = getVault();
    for (const p of vault.people) {
      if (p.displayName.toLowerCase().includes(needle) || p.slug.includes(needle)) {
        console.log(`person  ${p.slug}  ${p.displayName}`);
      }
    }
    for (const p of vault.projects) {
      if (p.title.toLowerCase().includes(needle) || p.id.includes(needle)) {
        console.log(`project ${p.id}  ${p.title}`);
      }
    }
    for (const t of vault.tasks) {
      if (t.title.toLowerCase().includes(needle)) console.log(`task    ${t.id}  ${t.title}`);
    }
    for (const n of vault.notes) {
      if (n.title.toLowerCase().includes(needle) || n.body.toLowerCase().includes(needle)) {
        console.log(`note    ${n.path}  ${n.title}`);
      }
    }
    break;
  }

  case 'problems': {
    const problems = getVault().problems;
    if (problems.length === 0) {
      console.log('No problems found.');
      break;
    }
    for (const p of problems) console.log(`${p.path}\n  ${p.message}`);
    process.exit(1);
    break;
  }

  default:
    usage();
}
