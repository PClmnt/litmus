# Litmus

A powerful terminal-based LLM benchmarking and evaluation tool built with **OpenTUI**. Compare multiple language models side-by-side, evaluate their tool usage capabilities, and analyze results with automated LLM-as-judge scoring.

![](images/main.png)

## Features

### 🎯 Side-by-Side Model Comparison

- Run identical prompts across multiple LLMs simultaneously
- Real-time streaming responses with progress indicators
- Support for popular models (Grok, Olmo, Qwen, and more via OpenRouter)
- Visual comparison grid with response timing

### 🛠️ Tool Use Evaluation

- Test models with function calling capabilities
- Built-in tools: Calculator, Web Search (mock), Code Execution
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
- Export capabilities for further analysis
- Track performance over time

![](images/history.png)

### ⌨️ Rich Terminal UI

- Keyboard-driven navigation
- Multiple views: Benchmark, History, Evaluations, Settings
- Real-time console for debugging
- Intuitive focus management and shortcuts

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

### Navigation

- **Tab** - Switch between UI sections
- **Arrow Keys** - Navigate within sections
- **1-4** - Quick switch between main views
- **Ctrl+K** - Toggle debug console
- **Escape** - Go back or focus navigation
- **/** - Focus search (History view)
- **q** - Quit current view

## Database Schema

Litmus uses SQLite to store:

- **runs** - Benchmark execution sessions
- **model_responses** - Individual model outputs per run
- **evaluations** - LLM-as-judge evaluation records
- **evaluation_scores** - Detailed scoring per model
- **prompt_templates** - Reusable test prompts
- **test_suites** - Grouped test scenarios

```bash
# Database location
data/Litmus.db
```

## Configuration

### Environment Variables

```bash
OPENROUTER_API_KEY=your_key_here
# Optional: Custom models, API endpoints, etc.
```

### Adding Custom Models

Edit `src/views/BenchmarkView.tsx` to add new models:

```typescript
const AVAILABLE_MODELS = [
  {
    name: "Your Model Name",
    value: "provider/model-id",
    description: "Description here",
  },
];
```

## Adding Custom Tools

Create a new tool in `src/tools/`:

```typescript
export const myTool = tool({
  description: "What this tool does",
  parameters: z.object({
    param: z.string().describe("Parameter description"),
  }),
  execute: async ({ param }) => {
    // Implementation
    return result;
  },
});
```

Then register it in `src/tools/index.ts`.

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

- 📖 [OpenTUI Documentation](https://opentui.ai)
- 💬 [GitHub Discussions](https://github.com/your-username/Litmus/discussions)
- 🐛 [Issue Tracker](https://github.com/your-username/Litmus/issues)
