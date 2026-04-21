const GRID_REWARD_TITLE = 'Гра: Nymo 2048';

export function setupGrid2048MiniGameRuntime({
  app,
  miniGamesSection = null,
  getCurrentMiniGameView = () => 'tapper',
  gridPanelEl = null,
  gridBoardEl = null,
  gridCanvasEl = null,
  gridScoreEl = null,
  gridBestEl = null,
  gridEarnedEl = null,
  balanceEl = null,
  gridSize = 4,
  gridBestKey = 'orionGrid2048Best'
} = {}) {
  const size = Number.isFinite(gridSize) && gridSize > 1 ? Math.floor(gridSize) : 4;
  const state = {
    board: new Array(size * size).fill(0),
    score: 0,
    best: 0,
    isGameOver: false,
    earnedCents: 0,
    rewardLogged: false
  };

  try {
    const savedBest = Number.parseInt(window.localStorage.getItem(gridBestKey) || '0', 10);
    state.best = Number.isFinite(savedBest) && savedBest > 0 ? savedBest : 0;
  } catch {
    state.best = 0;
  }

  const saveGridBest = () => {
    try {
      window.localStorage.setItem(gridBestKey, String(Math.max(0, Math.floor(state.best || 0))));
    } catch {
      // Ignore storage failures.
    }
  };

  const commitGridReward = () => {
    if (state.rewardLogged || state.earnedCents <= 0) return;
    app.addCoinTransaction({
      amountCents: state.earnedCents,
      title: GRID_REWARD_TITLE,
      category: 'games'
    });
    state.rewardLogged = true;
  };

  const getGridRow = (row) => {
    const start = row * size;
    return state.board.slice(start, start + size);
  };

  const setGridRow = (row, values) => {
    const start = row * size;
    for (let index = 0; index < size; index += 1) {
      state.board[start + index] = values[index];
    }
  };

  const getGridColumn = (col) => (
    Array.from({ length: size }, (_, row) => state.board[row * size + col])
  );

  const setGridColumn = (col, values) => {
    for (let row = 0; row < size; row += 1) {
      state.board[row * size + col] = values[row];
    }
  };

  const mergeGridLine = (line) => {
    const compact = line.filter((value) => value !== 0);
    let gained = 0;

    for (let index = 0; index < compact.length - 1; index += 1) {
      if (compact[index] !== compact[index + 1]) continue;
      compact[index] *= 2;
      gained += compact[index];
      compact.splice(index + 1, 1);
    }

    while (compact.length < size) compact.push(0);

    const moved = compact.some((value, index) => value !== line[index]);
    return { values: compact, gained, moved };
  };

  const getGridEmptyIndexes = () => {
    const indexes = [];
    state.board.forEach((value, index) => {
      if (value === 0) indexes.push(index);
    });
    return indexes;
  };

  const spawnGridTile = (count = 1) => {
    for (let index = 0; index < count; index += 1) {
      const emptyIndexes = getGridEmptyIndexes();
      if (!emptyIndexes.length) return;
      const randomIndex = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
      state.board[randomIndex] = Math.random() < 0.9 ? 2 : 4;
    }
  };

  const checkGridGameOver = () => {
    if (state.board.includes(0)) return false;

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const index = row * size + col;
        const value = state.board[index];
        const right = col < size - 1 ? state.board[index + 1] : null;
        const down = row < size - 1 ? state.board[index + size] : null;
        if (value === right || value === down) return false;
      }
    }

    return true;
  };

  const renderGrid2048 = () => {
    if (!gridBoardEl) return;

    if (gridBoardEl.childElementCount !== size * size) {
      gridBoardEl.innerHTML = '';
      for (let index = 0; index < size * size; index += 1) {
        const cell = document.createElement('div');
        cell.className = 'tile';
        gridBoardEl.appendChild(cell);
      }
    }

    const tiles = gridBoardEl.querySelectorAll('.tile');
    tiles.forEach((tile, index) => {
      const value = state.board[index];
      tile.className = 'tile';
      tile.textContent = value ? String(value) : '';
      if (!value) return;

      const cappedClass = value <= 2048 ? `value-${value}` : 'value-2048';
      tile.classList.add(cappedClass);
      if (value >= 128) tile.classList.add('value-high');
      if (value >= 1024) tile.classList.add('value-super');
    });

    if (gridScoreEl) gridScoreEl.textContent = String(state.score);
    if (gridBestEl) gridBestEl.textContent = String(state.best);
    if (gridEarnedEl) gridEarnedEl.textContent = app.formatCoinBalance(state.earnedCents);

    const endMessage = state.isGameOver
      ? `Гру завершено\nЗароблено: ${app.formatCoinBalance(state.earnedCents)}`
      : '';

    if (gridPanelEl) {
      gridPanelEl.classList.toggle('game-over', state.isGameOver);
    }
    if (gridCanvasEl) {
      gridCanvasEl.dataset.endMessage = endMessage;
    }
  };

  const startGrid2048 = () => {
    commitGridReward();
    state.board = new Array(size * size).fill(0);
    state.score = 0;
    state.isGameOver = false;
    state.earnedCents = 0;
    state.rewardLogged = false;
    spawnGridTile(2);
    renderGrid2048();
  };

  const applyGridMove = (direction) => {
    if (state.isGameOver) return false;

    let moved = false;
    let gainedTotal = 0;

    const processLine = (line, reverse = false) => {
      const source = reverse ? [...line].reverse() : [...line];
      const merged = mergeGridLine(source);
      const values = reverse ? merged.values.reverse() : merged.values;
      if (merged.moved) moved = true;
      gainedTotal += merged.gained;
      return values;
    };

    if (direction === 'left' || direction === 'right') {
      for (let row = 0; row < size; row += 1) {
        const nextValues = processLine(getGridRow(row), direction === 'right');
        setGridRow(row, nextValues);
      }
    } else {
      for (let col = 0; col < size; col += 1) {
        const nextValues = processLine(getGridColumn(col), direction === 'down');
        setGridColumn(col, nextValues);
      }
    }

    if (!moved) return false;

    state.score += gainedTotal;
    if (gainedTotal > 0) {
      const rewardCents = Math.max(1, Math.floor(gainedTotal / 16));
      state.earnedCents += rewardCents;
      app.setTapBalanceCents(app.getTapBalanceCents() + rewardCents, {
        transactionMeta: {
          title: GRID_REWARD_TITLE,
          category: 'games',
          amountCents: rewardCents
        }
      });
      if (balanceEl) {
        balanceEl.textContent = app.formatCoinBalance(app.getTapBalanceCents());
      }
    }

    if (state.score > state.best) {
      state.best = state.score;
      saveGridBest();
    }

    spawnGridTile(1);
    state.isGameOver = checkGridGameOver();
    if (state.isGameOver) commitGridReward();
    renderGrid2048();
    return true;
  };

  const handleGridMove = (direction) => {
    if (getCurrentMiniGameView() !== 'grid2048') return;
    if (!miniGamesSection?.isConnected || !miniGamesSection.classList.contains('active')) return;
    applyGridMove(direction);
  };

  return {
    state,
    startGrid2048,
    handleGridMove,
    commitGridReward,
    renderGrid2048
  };
}
