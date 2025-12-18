# LaTeX Auto Renderer for Chrome

A browser extension that automatically renders LaTeX equations on web pages using KaTeX.

## Features

- Automatically detects and renders LaTeX equations
- Supports multiple delimiter styles:
  - Display math: `$$...$$`, `\[...\]`, `[...]`
  - Inline math: `$...$`, `\(...\)`, `(...)`
- Fast rendering with KaTeX
- Works on dynamically loaded content
- No external dependencies required

## Installation

### From Chrome Web Store
[Link will be added after publication]

### Manual Installation (Development)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the extension directory

## Usage

Once installed, the extension automatically renders LaTeX on any webpage. No configuration needed!

### Supported Delimiters

**Display Math (centered, larger):**
- `[ \frac{dQ}{dt} = -k Q ]`
- `\[ \frac{dQ}{dt} = -k Q \]`
- `$$ \frac{dQ}{dt} = -k Q $$`

**Inline Math (in-line with text):**
- `( Q_0 )` - variables with subscripts/superscripts
- `\( Q_0 \)` - standard LaTeX inline
- `$ Q_0 $` - single dollar inline

## Technical Details

- Built with KaTeX for fast math rendering
- Manifest V3 compatible
- Minimal permissions required
- ~1.5 MB installed size

## License

This extension is released under the MIT License.

The KaTeX library is licensed under the MIT License. See [LICENSE-KaTex](LICENSE-KaTex) for details.

## Credits

- [KaTeX](https://katex.org/) - Fast math typesetting library

## Contributing

Contributions welcome! Please feel free to submit issues or pull requests.
