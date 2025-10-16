# ⏰ Emoji Timer - Chrome Extension

A beautiful, customizable timer extension for Chrome that injects a draggable timer with emoji reactions into any webpage. Perfect for productivity, focus sessions, and time tracking.

![Extension Icon](icon-128.png)

## ✨ Features

- **🎯 Customizable Emoji Reactions**: Set different emojis for different time intervals
- **📏 Adjustable Size**: Choose between small and large timer sizes
- **🖱️ Draggable Interface**: Move the timer anywhere on the page
- **💾 Local Storage**: All settings saved locally in your browser
- **⚡ Real-time Updates**: Timer updates every second with smooth transitions
- **🔒 Privacy First**: No tracking, no data collection, no external requests

## 🚀 Installation

### Method 1: Load Unpacked Extension (Recommended)

1. **Download the extension**:
   - Click the green "Code" button on this repository
   - Select "Download ZIP"
   - Extract the ZIP file to a folder on your computer

2. **Load the extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `emoji-timer` folder from the extracted files

3. **Pin the extension** (optional):
   - Click the puzzle piece icon in Chrome's toolbar
   - Pin the Emoji Timer extension for easy access

### Method 2: Clone Repository

```bash
git clone https://github.com/arturhaddad/emoji-timer.git
cd emoji-timer
```

Then follow steps 2-3 from Method 1.

## 🎮 How to Use

1. **Show/Hide Timer**: Click the extension icon in your toolbar
2. **Move Timer**: Drag the timer to any position on the page
3. **Reset Timer**: Click the ↺ button on the timer
4. **Close Timer**: Click the ✕ button on the timer
5. **Customize Settings**: Click "Times config" in the popup to:
   - Add/remove time intervals
   - Change emoji reactions
   - Adjust timer size
   - Set initial elapsed time

## ⚙️ Configuration

### Default Time Intervals

| Time | Emoji | Description |
|------|-------|-------------|
| 0:00 | 🏆 | Start |
| 15:00 | 🙂 | Good progress |
| 25:00 | 😐 | Getting there |
| 30:00 | 🤨 | Halfway point |
| 40:00 | 😠 | Getting tired |
| 50:00 | 😡 | Almost there |
| 55:00 | 🤯 | Final stretch |
| 60:00 | 😴 | Time's up! |

### Customization Options

- **Add Time Intervals**: Click "Add time" to create new emoji reactions
- **Remove Intervals**: Click the ✕ next to any interval (except the first one)
- **Change Emojis**: Edit the emoji field for any time interval
- **Timer Size**: Choose between Small and Large sizes
- **Initial Time**: Set a starting elapsed time for the timer

## 🔧 Technical Details

### Permissions

- **`activeTab`**: To inject the timer into the active tab
- **`scripting`**: To execute the timer code on the page
- **`storage`**: To save your settings locally

### Data Storage

All data is stored locally using Chrome's Storage API:
- Timer configurations (time intervals and emojis)
- Size preferences
- Elapsed time settings

**No data is sent to external servers or collected by the extension.**

### Browser Compatibility

- Chrome (Manifest V3)
- Chromium-based browsers (Edge, Brave, etc.)

## 🛠️ Development

### Project Structure

```
emoji-timer/
├── manifest.json          # Extension manifest
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── privacy-policy.html    # Privacy policy page
├── index.html             # GitHub Pages landing page
├── README.md              # This file
└── icons/                 # Extension icons
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    └── icon-128.png
```

### Key Features Implementation

- **Shadow DOM**: Timer is injected using Shadow DOM for style isolation
- **Drag & Drop**: Custom drag implementation for timer positioning
- **Real-time Updates**: Uses `setInterval` with `requestAnimationFrame` fallback
- **Local Storage**: Chrome Storage API for persistent settings
- **Content Scripts**: Injected functions for timer manipulation

## 📄 Privacy Policy

This extension does not collect, store, or transmit any personal information. All functionality operates locally in your browser. See [privacy-policy.html](privacy-policy.html) for complete details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 📞 Support

If you have any questions or need help:

- **Email**: contact@artur.me
- **GitHub Issues**: [Create an issue](https://github.com/arturhaddad/emoji-timer/issues)
- **GitHub**: [@arturhaddad](https://github.com/arturhaddad)

## 🌟 Show Your Support

If you find this extension helpful, please give it a ⭐ on GitHub!

---

Made with ❤️ by [Artur Haddad](https://github.com/arturhaddad)
