```
___  ___   ___               ___         ___   ___ 
.'|        .'| `._|=|   |=|_.'   .'|\/|`.   |   | |`.   |   |=|_.' 
.'  |      .'  |      |   |      .'  |  |  `. |   | |  `. `.  |      
|   |      |   |      |   |      |   |  |   | |   | |   |   `.|=|`.  
|   |  ___ |   |      `.  |      |   |  |   | `.  | |   |  ___  |  `.
|___|=|_.' |___|        `.|      |___|  |___|   `.|=|___|  `._|=|___|
```

A terminal-based LLM benchmarking and evaluation tool built with **OpenTUI**. Compare multiple language models side-by-side, evaluate their tool usage capabilities, and analyze results with automated [...]

![](images/main.png)

## Features

### 🎯 Side-by-Side Model Comparison

- Run identical prompts across multiple LLMs simultaneously
- Real-time streaming responses with progress indicators
- Support for popular models (Grok, Olmo, Qwen, and more via OpenRouter)
- Visual comparison grid with response timing

### 🛠️ Tool Use Evaluation

- Test models with function calling capabilities
- Track tool invocations and results
- Evaluate proper tool selection and usage

### 🤖 Automated Evaluation (LLM-as-Judge)

- Run automated evaluations using dedicated judge models
- Multi-criteria scoring (accuracy, relevance, reasoning, tool use)
- Pairwise comparisons and ranking
- Detailed reasoning and score breakdowns

![](images/eval.png)

### 🗄️ Persistent Storage

- SQLite database for all benchmark runs and results
- Searchable history of past runs
- Track performance over time

![](images/history.png)



## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Litmus
cd Litmus

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your OpenRouter API key
```

## Quick Start

```bash
# Run the application
bun dev
```

### Basic Workflow

1. **Select Models** - Choose from available models in the dropdown
2. **Enter Prompt** - Type your test prompt or select from templates
3. **Enable Tools** - Toggle tools to test function calling (optional)
4. **Generate** - Press `Enter` or `g` to run the benchmark
5. **Evaluate** - Press `e` in the Evaluation view to run LLM-as-judge scoring

## Configuration

### Environment Variables

```bash
OPENROUTER_API_KEY=your_key_here
# Optional: Custom models, API endpoints, etc.
```


## Evaluation Criteria

Litmus evaluates models on:

- **Accuracy** - Correctness of information
- **Completeness** - Thoroughness of response
- **Relevance** - How well it addresses the prompt
- **Clarity** - Communication quality
- **Tool Use** - Proper function calling (when applicable)
- **Overall Score** - Weighted combination

## Keyboard Shortcuts

### Global

- **Ctrl+K** - Toggle console
- **Tab** - Cycle focus
- **Escape** - Back/Focus nav

### Benchmark View

- **g** - Generate responses
- **Enter** - Add model (when focused)
- **Space** - Toggle tool
- **d** - Remove last model

### Evaluation View

- **e** - Run evaluation
- **Left/Right** - Select judge model
- **q** - Back to history

### History View

- **/** - Focus search
- **Enter** - Select run
- **Delete** - Remove run

## Architecture

```
src/
├── components/          # Reusable UI components
├── views/              # Main application views
│   ├── BenchmarkView.tsx    # Model comparison
│   ├── EvaluationView.tsx   # LLM-as-judge scoring
│   ├── HistoryView.tsx      # Past runs browser
│   └── SettingsView.tsx     # Configuration
├── tools/              # Function calling tools
├── evaluation/         # Judge logic and prompts
├── db/                 # Database layer
├── types/              # TypeScript types
└── ai.ts              # AI provider integration
```

## Development

```bash
# Install dependencies
bun install

# Run development mode
bun dev

# Build for production
bun build

# Run tests
bun test
```

## License

MIT License - see LICENSE file for details.

- 🐛 [Issue Tracker](https://github.com/your-username/Litmus/issues)
