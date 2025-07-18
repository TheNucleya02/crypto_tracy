from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
)
import os
import sys
import logging

# === Logging setup ===
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# === Add your project folder to sys.path ===
sys.path.append('/Users/aman/Desktop/Crypto_Ass')

# === Import functions ===
from Analysis import final_summary, plot_market_graph

# === Load bot token from environment ===
BOT = os.getenv("BOT_API")
if not BOT:
    raise ValueError("BOT_API token is not set in the environment.")

# === Inline keyboard options ===
def get_ticker_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("BTC", callback_data='ticker_BTC')],
        [InlineKeyboardButton("ETH", callback_data='ticker_ETH')],
        [InlineKeyboardButton("SOL", callback_data='ticker_SOL')],
        [InlineKeyboardButton("DOGE", callback_data='ticker_DOGE')],
    ])

# === /start command ===
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Welcome to Crypto_Assistant!\n\nWhich ticker symbol are you interested in?\n(Or type /custom SYMBOL for others)",
        reply_markup=get_ticker_keyboard()
    )

# === Handle inline button clicks ===
async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):

    query = update.callback_query
    await query.answer()
    if query.data.startswith("ticker_"):
        symbol = query.data.split("_")[1]
        loading_message = await query.message.reply_text("🤖 Hold tight!! Generating the summary for you...")
        try:
            result_text = final_summary(symbol)
            img_path, error = plot_market_graph(symbol)
        except Exception as e:
            result_text = f"❌ Error: {e}"
            img_path, error = None, f"⚠️ {e}"
        finally:
            await loading_message.delete()

        back_keyboard = [[InlineKeyboardButton("🔙 Back", callback_data="go_back")]]
        reply_markup = InlineKeyboardMarkup(back_keyboard)

        if error:
            await query.message.reply_text(result_text + "\n\n" + error, reply_markup=reply_markup)
        else:
            try:
                with open(img_path, 'rb') as photo:
                    await query.message.reply_photo(photo=photo, caption=result_text, reply_markup=reply_markup)
            except Exception as e:
                await query.message.reply_text(f"{result_text}\n⚠️ Error sending chart: {e}", reply_markup=reply_markup)
            finally:
                if img_path and os.path.exists(img_path):
                    os.remove(img_path)
    elif query.data == "go_back":
        await query.message.reply_text(
            text="🔁 Choose another ticker:",
            reply_markup=get_ticker_keyboard()
        )

# === /custom SYMBOL command ===
async def custom_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if len(context.args) != 1:
        await update.message.reply_text("❌ Please provide a symbol like: /custom BTC")
        return
    symbol = context.args[0].upper()
    loading_message = await update.message.reply_text("🤖 Hold tight!! Generating the summary for you...")

    back_keyboard = [[InlineKeyboardButton("🔙 Back", callback_data="go_back")]]
    reply_markup = InlineKeyboardMarkup(back_keyboard)

    try:
        result_text = final_summary(symbol)
        img_path, error = plot_market_graph(symbol)
    except Exception as e:
        result_text = f"❌ Error: {e}"
        img_path, error = None, f"⚠️ {e}"
    finally:
        await loading_message.delete()

    if error:
        await update.message.reply_text(result_text + "\n\n" + error, reply_markup=reply_markup)
    else:
        try:
            with open(img_path, 'rb') as photo:
                await update.message.reply_photo(photo=photo, caption=result_text, reply_markup=reply_markup)
        except Exception as e:
            await update.message.reply_text(f"{result_text}\n⚠️ Error sending chart: {e}", reply_markup=reply_markup)
        finally:
            if img_path and os.path.exists(img_path):
                os.remove(img_path)

# === Run bot ===
if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("custom", custom_command))
    app.add_handler(CallbackQueryHandler(button_handler))
    logging.info("🤖 Cry_Ass bot is now running...")
    app.run_polling()
