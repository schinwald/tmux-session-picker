import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { getProjects, sortProjects, type Project, displayRoot } from './projects';
import { openProject } from './launcher';
import { loadFavorites, saveFavorites } from './favorites';

const reset = '\u001b[0m';
const dim = '\u001b[2m';
const borderDim = '\u001b[2;90m';
const bold = '\u001b[1m';
const green = '\u001b[92m';
const cyan = '\u001b[96m';
const yellow = '\u001b[93m';
const white = '\u001b[97m';
const selection = '\u001b[2;37m';
const selectedBackground = '\u001b[48;2;41;46;66m';
const boxWidth = 96;

const favorites = loadFavorites();
const projects = sortProjects(getProjects(), favorites);

const selectFallback = async (): Promise<Project | null> => {
  if (projects.length === 0) {
    console.log('No tmuxinator projects found.');
    return null;
  }

  const readline = createInterface({ input, output });
  projects.forEach((project, index) => {
    console.log(
      `${index + 1}. ${project.name}${project.running ? ' (running)' : ' (lazy)'}`,
    );
  });
  const answer = await readline.question('Select project number (or q): ');
  readline.close();
  if (answer.trim().toLowerCase() === 'q') return null;
  return projects[Number(answer) - 1] ?? null;
};

const selectInteractive = async (): Promise<Project | null> => {
  const visibleCount = 10;
  let selectedIndex = 0;
  let scrollOffset = 0;
  let query = '';
  let filteredProjects = projects;
  let rows = new Map<number, number>();
  let screenRow = 1;
  let lastClick: { index: number; time: number } | null = null;

  type InputKey = { name?: string; ctrl?: boolean };
  let handleInput = (_character: string, _key?: InputKey) => undefined;
  let activateProject = (_project: Project) => undefined;

  const visibleLength = (value: string) =>
    value.replace(/\u001b\[[0-9;]*m/g, '').length;

  const render = () => {
    screenRow = 1;
    rows = new Map();
    filteredProjects = projects.filter((project) =>
      `${project.project} ${project.name} ${project.root} ${project.running ? 'running' : 'lazy'}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    selectedIndex = Math.min(selectedIndex, Math.max(0, filteredProjects.length - 1));
    if (selectedIndex < scrollOffset) scrollOffset = selectedIndex;
    if (selectedIndex >= scrollOffset + visibleCount) {
      scrollOffset = selectedIndex - visibleCount + 1;
    }
    const visibleProjects = filteredProjects.slice(
      scrollOffset,
      scrollOffset + visibleCount,
    );

    const printLine = (content = '', isSelected = false) => {
      const padding = ' '.repeat(Math.max(0, boxWidth - 2 - visibleLength(content)));
      const styled = isSelected
        ? `${selectedBackground}${content.replaceAll(reset, `${reset}${selectedBackground}`)}${padding}${reset}`
        : `${content}${padding}`;
      output.write(`${borderDim}│${reset} ${styled} ${borderDim}│${reset}\n`);
      screenRow += 1;
    };

    const statusWidth = 9;
    const projectWidth = boxWidth - 16;

    output.write('\u001b[2J\u001b[H');
    output.write(`${borderDim}╭─${reset}${bold} TMUX SESSION PICKER ${reset}${borderDim}${'─'.repeat(boxWidth - 16)}╮${reset}\n`);
    screenRow += 1;
    printLine(`${bold}>${reset} ${white}${query}${reset}${white}█${reset}`);
    output.write(`${borderDim}├${'─'.repeat(boxWidth)}┤${reset}\n`);
    screenRow += 1;

    const listStartRow = screenRow;
    visibleProjects.forEach((project, visibleIndex) => {
      const index = scrollOffset + visibleIndex;
      const isSelected = index === selectedIndex;
      const marker = isSelected ? `${selection}▌${reset}` : ' ';
      const favorite = favorites.has(project.project);
      const favoriteMarker = favorite ? `${yellow}${reset}` : ' ';
      const displayName =
        project.name.length > projectWidth
          ? `${project.name.slice(0, projectWidth - 1)}…`
          : project.name;
      const projectPadding = ' '.repeat(projectWidth - displayName.length);
      const state = project.running
        ? `${green}● running${reset}`
        : `${dim}○ lazy${reset}`;
      const line = `${marker} ${white}${displayName}${reset} ${favoriteMarker}${projectPadding} ${state}`;
      rows.set(screenRow, index);
      printLine(line, isSelected);
      rows.set(screenRow, index);
      const rootPath = displayRoot(project.root);
      const root =
        rootPath.length > boxWidth - 4
          ? `${rootPath.slice(0, boxWidth - 5)}…`
          : rootPath;
      printLine(`${marker} ${dim}${root}${reset}`, isSelected);
    });

    if (filteredProjects.length === 0) {
      printLine(`${dim}No matching projects${reset}`);
    } else if (scrollOffset > 0 || scrollOffset + visibleCount < filteredProjects.length) {
      const indicator = `${scrollOffset > 0 ? '↑ more' : ''}${
        scrollOffset > 0 && scrollOffset + visibleCount < filteredProjects.length ? ' · ' : ''
      }${scrollOffset + visibleCount < filteredProjects.length ? '↓ more' : ''}`;
      printLine(`  ${cyan}${indicator}${reset}`);
    }
    while (screenRow < listStartRow + visibleCount * 2 + 1) printLine();
    output.write(`${borderDim}╰${'─'.repeat(boxWidth)}╯${reset}`);
  };

  const onInputData = (data: Buffer) => {
    const text = data.toString();
    const mouseEvent = /\u001b\[<([0-9]+);([0-9]+);([0-9]+)([mM])/.exec(text);
    if (mouseEvent) {
      if (mouseEvent[1] !== '0' || mouseEvent[4] !== 'M') return;
      const optionIndex = rows.get(Number(mouseEvent[3]));
      if (optionIndex !== undefined) {
        const now = Date.now();
        const isDoubleClick =
          lastClick?.index === optionIndex && now - lastClick.time < 400;
        lastClick = { index: optionIndex, time: now };
        selectedIndex = optionIndex;
        if (isDoubleClick) return activateProject(filteredProjects[optionIndex]);
        render();
      }
      return;
    }

    const specialKeys: Record<string, InputKey> = {
      '\u001b[A': { name: 'up' },
      '\u001b[B': { name: 'down' },
      '[A': { name: 'up' },
      '[B': { name: 'down' },
      '\r': { name: 'return' },
      '\n': { name: 'return' },
      '\u007f': { name: 'backspace' },
      '\u001b': { name: 'escape' },
      '\u0003': { name: 'c', ctrl: true },
      '\u0006': { name: 'f', ctrl: true },
    };
    if (specialKeys[text]) return handleInput('', specialKeys[text]);
    if (text.includes('[A') || text.includes('[B')) {
      for (const sequence of text.match(/\[A|\[B/g) ?? []) {
        handleInput('', { name: sequence === '[A' ? 'up' : 'down' });
      }
      return;
    }
    for (const character of text) handleInput(character);
  };

  input.setRawMode(true);
  input.resume();
  input.on('data', onInputData);
  output.write('\u001b[?25l\u001b[?1000h\u001b[?1006h');
  render();

  return new Promise((resolve) => {
    const finish = (project: Project | null) => {
      input.removeListener('data', onInputData);
      input.setRawMode(false);
      input.pause();
      output.write('\u001b[?25h\u001b[?1000l\u001b[?1006l\u001b[2J\u001b[H');
      resolve(project);
    };

    activateProject = (project) => finish(project);

    handleInput = (character, key) => {
      if (key?.ctrl && key.name === 'c') return finish(null);
      if (key?.ctrl && key.name === 'f' && filteredProjects.length > 0) {
        const project = filteredProjects[selectedIndex];
        if (favorites.has(project.project)) favorites.delete(project.project);
        else favorites.add(project.project);
        saveFavorites(favorites);
        return render();
      }
      if (key?.name === 'up') {
        if (filteredProjects.length > 0) {
          selectedIndex = (selectedIndex - 1 + filteredProjects.length) % filteredProjects.length;
        }
        return render();
      }
      if (key?.name === 'down') {
        if (filteredProjects.length > 0) selectedIndex = (selectedIndex + 1) % filteredProjects.length;
        return render();
      }
      if (key?.name === 'backspace') {
        query = query.slice(0, -1);
        selectedIndex = 0;
        scrollOffset = 0;
        return render();
      }
      if (key?.name === 'return' && filteredProjects.length > 0) {
        return finish(filteredProjects[selectedIndex]);
      }
      if (key?.name === 'escape' || (character === 'q' && query === '')) return finish(null);
      if (character && character >= ' ' && !key?.ctrl) {
        query += character;
        selectedIndex = 0;
        scrollOffset = 0;
        return render();
      }
    };
  });
};

const main = async () => {
  if (projects.length === 0) {
    console.log('No tmuxinator projects found.');
    return;
  }

  const selected = input.isTTY && output.isTTY ? await selectInteractive() : await selectFallback();
  if (selected) process.exit(openProject(selected));
};

void main();
