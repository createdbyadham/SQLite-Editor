# LightDB

A modern, fast, and user-friendly SQLite database viewer/editor built with React and Electron. View, edit, and manage your SQLite databases with a beautiful interface.

![LightDB](./screenshot.png)

## Features

- 🚀 **Fast and Responsive**: Built with performance in mind
- 🎨 **Modern UI**: Clean interface using Tailwind CSS
- 📝 **Edit Support**: View and edit database records directly
- 🔍 **Advanced Search**: Filter and search through your data
- ⚡ **Real-time Updates**: Changes reflect immediately
- 💾 **Save Changes**: Save modifications back to the original database file
- 📊 **Data Sorting**: Sort any column with a click
- 📱 **Responsive Design**: Works great on any screen size

## Tech Stack

- ⚛️ React
- 🔷 TypeScript
- ⚡ Vite
- 🎨 Tailwind CSS
- 🖥️ Electron

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sleek-database-viewer.git
cd sleek-database-viewer
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

### Building for Production

```bash
npm run build
# or
yarn build
```

## Usage

1. Launch the application
2. Click "Upload Database" or drag and drop your SQLite database file
3. Browse tables using the table selector
4. Use the search bar to filter data
5. Double-click any row to edit
6. Click "Save Changes" to persist modifications

## Development

### Project Structure

```
src/
  ├── components/     # React components
  ├── hooks/         # Custom React hooks
  ├── lib/           # Utilities and services
  ├── styles/        # Global styles
  └── types/         # TypeScript type definitions
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
