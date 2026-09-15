# Synaptech ERP

Full-stack Enterprise Resource Planning system built with **.NET 10 Web API** (Backend) and **Angular 22** (Frontend).

## Project Structure

```
synaptech-erp/
├── backend/
│   └── SynaptechERP.API/    # .NET Web API solution
└── frontend/                # Angular application
```

## Getting Started

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Node.js](https://nodejs.org/) (v18+ recommended)
- PostgreSQL database

### 1. Run the Backend (.NET Web API)

```bash
cd backend/SynaptechERP.API
dotnet run
```
The API server will start at `http://localhost:5245`.

### 2. Run the Frontend (Angular)

```bash
cd frontend
npm install
npm start
```
The Angular application will start at `http://localhost:4200`.

## Building for Production

### Frontend
```bash
cd frontend
npm run build
```
Artifacts are generated in `frontend/dist/synaptech-erp`.

### Backend
```bash
cd backend/SynaptechERP.API
dotnet publish -c Release
```
