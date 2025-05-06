📱 Retrofit Android App - Product Fetcher

This is a simple Android application built using **Kotlin** and **Jetpack Compose**, which fetches product data from a REST API using **Retrofit** and logs the response in **Logcat**.

---

🚀 Features

- Fetches product data from an API.
- Uses **Retrofit** for network calls.
- Uses **GSON Converter** to parse JSON.
- Logs the product data (name, price, etc.) to **Logcat**.
- Built with **Jetpack Compose**.

---

🛠️ Tech Stack

- Kotlin
- Jetpack Compose
- Retrofit
- GSON Converter
- OkHttp Logging Interceptor

---

📂 Project Structure

```plaintext
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   ├── com.example.retrofit/
│   │   │   │   │   ├── model/           # Product model class
│   │   │   │   │   ├── api/             # API interface
│   │   │   │   │   ├── network/         # Retrofit client
│   │   │   │   │   └── MainActivity.kt  # Main Activity
