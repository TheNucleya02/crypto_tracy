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
crypto-assistant-backend/

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
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

---

## 📖 API Documentation

### Portfolio Management

#### Add Portfolio Entry
```bash
POST /api/v1/portfolio/add
Content-Type: application/json

{
  "symbol": "bitcoin",
  "amount": 0.5,
  "buy_price": 45000,
  "purchase_date": "2024-01-15"
}
```

#### Get Portfolio with P&L
```bash
GET /api/v1/portfolio
```

**Response:**
```json
{
  "portfolio": [
    {
      "id": 1,
      "symbol": "bitcoin",
      "name": "Bitcoin",
      "amount": 0.5,
      "buy_price": 45000,
      "current_price": 43500,
      "invested_value": 22500,
      "current_value": 21750,
      "profit_loss": -750,
      "profit_loss_percentage": -3.33,
      "purchase_date": "2024-01-15T00:00:00Z"
    }
  ],
  "total_invested": 22500,
  "total_current_value": 21750,
  "total_profit_loss": -750
}
```

### Market Data

#### Get Current Price
```bash
GET /api/v1/market/price/{symbol}
```

#### Get Market Summary
```bash
GET /api/v1/market/summary
```

### News & Insights

#### Get Latest News
```bash
GET /api/v1/news/latest?limit=10
```

#### Get AI Market Analysis
```bash
GET /api/v1/news/analysis
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=sqlite:///./crypto_portfolio.db

# API Keys
COINGECKO_API_KEY=your_coingecko_api_key
NEWS_API_KEY=your_news_api_key
OPENAI_API_KEY=your_openai_api_key

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

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_portfolio.py -v
```

---

## 🚀 Deployment

### Using Docker

```bash
# Build image
docker build -t crypto-assistant-backend .

# Run container
docker run -d -p 8000:8000 --env-file .env crypto-assistant-backend
```

### Using Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## 📈 Roadmap

### Phase 1 (Current)
- ✅ Basic portfolio tracking
- ✅ Real-time price data
- ✅ News aggregation
- ✅ REST API endpoints

### Phase 2 (Next)
- 🔄 WebSocket real-time updates
- 🔄 Advanced charting data
- 🔄 Price alerts system
- 🔄 User authentication

### Phase 3 (Future)
- 📋 Machine learning predictions
- 📋 Advanced portfolio analytics
- 📋 Social sentiment analysis
- 📋 Trading bot integration

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

**Created by**: [Aman](https://github.com/your-username)

### Get Support
- 📧 **Email**: your.email@example.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-username/crypto-assistant-backend/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-username/crypto-assistant-backend/discussions)

---

## 🙏 Acknowledgments

- [CoinGecko](https://coingecko.com) for reliable crypto data
- [FastAPI](https://fastapi.tiangolo.com/) for the excellent framework
- [SQLAlchemy](https://sqlalchemy.org/) for robust ORM capabilities
- The open-source community for inspiration and tools

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/your-username/crypto-assistant-backend)
![GitHub forks](https://img.shields.io/github/forks/your-username/crypto-assistant-backend)
![GitHub issues](https://img.shields.io/github/issues/your-username/crypto-assistant-backend)
![GitHub license](https://img.shields.io/github/license/your-username/crypto-assistant-backend)

**Made with ❤️ for the crypto community**