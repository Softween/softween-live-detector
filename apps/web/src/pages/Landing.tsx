import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-semibold">Live Checker</span>
          <div className="flex gap-3">
            <Link to="/login" className="text-sm px-4 py-2 text-gray-700 hover:text-gray-900">
              Giriş Yap
            </Link>
            <Link
              to="/register"
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Kayıt Ol
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Sitelerinizi 7/24 İzleyin
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Web sitelerinizin çalışma durumunu takip edin. Site down olduğunda anında email bildirimi alın.
        </p>

        <div className="flex justify-center gap-4 mb-16">
          <Link
            to="/register"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Ücretsiz Başla
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-left">
          <div className="p-6 rounded-xl bg-gray-50">
            <div className="text-2xl mb-3">🔍</div>
            <h3 className="font-semibold mb-2">Otomatik İzleme</h3>
            <p className="text-sm text-gray-600">
              Siteleriniz her 5 dakikada bir kontrol edilir. Kesintileri anında tespit eder.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-gray-50">
            <div className="text-2xl mb-3">📧</div>
            <h3 className="font-semibold mb-2">Email Bildirimi</h3>
            <p className="text-sm text-gray-600">
              Site down olduğunda ve tekrar aktif olduğunda email ile bilgilendirilirsiniz.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-gray-50">
            <div className="text-2xl mb-3">📊</div>
            <h3 className="font-semibold mb-2">Detaylı İstatistik</h3>
            <p className="text-sm text-gray-600">
              Uptime yüzdesi, yanıt süreleri ve kesinti geçmişini takip edin.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
