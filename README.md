# 🚀 Crypto Assistant Backend

Your personal **AI-powered crypto assistant backend** for **market insights, news analysis, and portfolio tracking**.  
This FastAPI backend application provides comprehensive cryptocurrency data, real-time price analysis, and portfolio management capabilities.

---

## 📌 Project Overview

The **Crypto Assistant Backend** is a robust REST API designed for **crypto traders, investors, and enthusiasts** who need:

- **Real-time cryptocurrency price data** and market analysis
- **News-based market insights** and sentiment analysis  
- **Portfolio tracking** with profit/loss calculations
- **AI-powered market summaries** and trading insights
- **Secure data persistence** with SQLite database

Built with modern Python technologies, this backend integrates with external APIs like **CoinGecko** for price data and various news sources for market intelligence.

---

## 🎯 Target Audience

- 🧑‍💻 **Crypto Investors** seeking automated portfolio tracking and insights
- 📈 **Day Traders** who need real-time data and news sentiment analysis
- 🏢 **Financial Apps** requiring crypto data integration
- 🎓 **Developers** learning FastAPI, SQLAlchemy, and API integrations

---

## ✨ Key Features

### 📈 Market Data & Analysis
- Real-time cryptocurrency prices from CoinGecko API
- Historical price data and trend analysis
- Market cap, volume, and price change calculations
- Support for 1000+ cryptocurrencies

### 📰 News & Sentiment Analysis
- Automated crypto news aggregation
- AI-powered sentiment analysis
- Market impact assessment
- News-based trading signals

### 💼 Portfolio Management
- Add/remove cryptocurrency holdings
- Real-time profit/loss calculations
- Portfolio performance tracking
- Investment history and analytics

### 🤖 AI-Powered Insights
- Market summary generation
- Trend analysis and predictions
- Personalized trading recommendations
- Risk assessment reports

---

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| **Framework** | [FastAPI](https://fastapi.tiangolo.com/) 0.104+ |
| **Database** | SQLite + SQLAlchemy ORM |
| **Data Validation** | Pydantic v2 |
| **HTTP Client** | httpx (async requests) |
| **External APIs** | CoinGecko API, News API |
| **Documentation** | Auto-generated OpenAPI/Swagger |
| **Python Version** | 3.9+ |

---

## 📂 Project Structure

```
crypto_assistant_backend/
├── .env.example
├── .gitignore
├── Analysis.py
├── auth.db
├── auth.py
├── crud.py
├── database.py
├── LICENSE
├── main.py
├── models.py
├── README.md
├── requirements.txt
└── setup_db.py

```

---

## ⚡ Quick Start

### Prerequisites
- Python 3.9 or higher
- pip (Python package manager)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/crypto-assistant-backend.git
cd crypto-assistant-backend
```

### 2. Create Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate     # On Linux/macOS
# or
venv\Scripts\activate        # On Windows
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your API keys
nano .env
```

### 5. Run the Application
```bash
# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6. Access the API

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
---
## 📸 Screenshot
<img width="1028" height="652" alt="Screenshot 2025-09-10 at 5 36 53 PM" src="https://github.com/user-attachments/assets/7fe2bd4d-1a07-45f7-9bd5-60519603f705" />

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=sqlite:///./crypto_portfolio.db

# API Keys
EXA_API = Your EXA_API
HF_TOKEN = Your Hugging Face access token
HF_MODEL = huggingface/meta-llama/Llama-3.1-8B-Instruct
ALPHA_API = Your Alpha API
CMC_API = Your CMC API
SECRET = Your Secret Key

# Application Settings
DEBUG=False
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000,https://yourfrontend.com
```

### API Rate Limits
- CoinGecko: 50 requests/minute (free tier)
- News API: 1000 requests/day (free tier)
- Implement caching for better performance

---

## 🤝 Contributing


We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow PEP 8 style guide
- Add tests for new features
- Update documentation as needed
- Use type hints for better code clarity

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author & Support

**Created by**: [Aman](https://github.com/TheNucleya02)

### Get Support
- 📧 **Email**: kr.amanjha02@gmail.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/TheNucleya02/crypto-assistant-backend/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/TheNucleya02/crypto-assistant-backend/discussions)

---

## 🙏 Acknowledgments

- [CoinGecko](https://coingecko.com) for reliable crypto data
- [FastAPI](https://fastapi.tiangolo.com/) for the excellent framework
- [SQLAlchemy](https://sqlalchemy.org/) for robust ORM capabilities
- The open-source community for inspiration and tools

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/TheNucleya02/crypto-assistant-backend)
![GitHub forks](https://img.shields.io/github/forks/TheNucleya02/crypto-assistant-backend)
![GitHub issues](https://img.shields.io/github/issues/TheNucleya02/crypto-assistant-backend)
![GitHub license](https://img.shields.io/github/license/TheNucleya02/crypto-assistant-backend)

**Made with ❤️ for the crypto community**
