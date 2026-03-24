export const COMMANDS = {
  PRESENT: '/present',
  ABSENT: '/absent',
  TASKS: '/tasks',
  ASSIGN: '/assign',
  UPDATE: '/update',
  ISSUE: '/issue',
  ISSUES: '/issues',
  RESOLVE: '/resolve',
  MEMEBERS: '/members',
  HELP: '/help',
};

export const COMMAND_HINTS = [
  { command: COMMANDS.PRESENT, hint: 'Mark attendance as present' },
  { command: COMMANDS.ABSENT, hint: 'Mark attendance as absent' },
  { command: COMMANDS.TASKS, hint: 'View your tasks' },
  { command: COMMANDS.ASSIGN, hint: '/assign @user or @all [task]' },
  { command: COMMANDS.UPDATE, hint: '/update [taskId] [message]' },
  { command: COMMANDS.ISSUE, hint: '/issue [message]' },
  { command: COMMANDS.ISSUES, hint: 'View active issues' },
  { command: COMMANDS.RESOLVE, hint: '/resolve [issueId]' },
  { command: COMMANDS.MEMEBERS, hint: 'View active members' },
  { command: COMMANDS.HELP, hint: 'View command hints' },
];
