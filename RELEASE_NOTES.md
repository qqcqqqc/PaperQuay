# PaperQuay v0.1.24 Release Notes

## ✨ New Features

### Selection Popup Redesign
- **Drag to Move** — Grab the grip handle on the selection popup to reposition it anywhere on screen.
- **Resize Handle** — Drag the bottom-right corner to resize the popup. Minimum size: 280×200 px.
- **Quick Highlight Colors** — 6 preset highlight colors (yellow, green, cyan, pink, red, purple) are now available directly in the selection popup, so you don't need to switch toolbar modes for quick annotation.
- **Hidden Source Text** — The original selected text is now hidden by default in the selection popup to keep the UI clean.

### Annotation Eraser Tool
- Added an **eraser tool** to the annotation toolbar. Click it to enter eraser mode, then click any ink or text annotation on the page to delete it.
- The old **"Delete Selected"** button has been removed in favor of this more intuitive click-to-erase workflow.

## 🐛 Bug Fixes

- **First-drag jumping** — Fixed: the selection popup would fly off-screen on the first drag attempt after opening. Now it follows the mouse correctly from the first interaction.
- **Popover content overflow** — Fixed: translation text box and action buttons would spill outside the popup's rounded border when resized very small. Added `overflow-hidden` and button wrapping.
- **Duplicate MinerU call** — Fixed a duplicate `onRunMineruParse` call in `LiteraturePaperDetails` component.

## 🔧 Other Changes

- Removed the manual **"Export Annotated PDF"** button (auto-save now handles annotation persistence).
- Keyboard shortcuts (Delete/Backspace) still work for removing selected annotations.
- Updated README with latest changes.

---

## 📦 Download

### Windows
- [PaperQuay-0.1.24-win32-x64-portable.zip](https://github.com/WangQrkkk/PaperQuay/releases/download/v0.1.24/PaperQuay-0.1.24-win32-x64-portable.zip) — Portable version, no installation required.

> ⚠️ **macOS**: Please build from source on a Mac machine, or use the CI workflow. Cross-building macOS DMG from Windows is not supported.

---

## 🛠 Build from Source

```bash
git clone https://github.com/WangQrkkk/PaperQuay.git
cd PaperQuay
npm install
npm run build
npm run electron:build -- --win   # Windows
npm run electron:build -- --mac   # macOS
npm run electron:build -- --linux # Linux
```
