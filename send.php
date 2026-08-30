<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Europe/Kyiv');

function respond(int $status, bool $success, string $message, array $extra = [])
{
    http_response_code($status);
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, false, 'Метод не підтримується.');
}

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: '', true);
if (!is_array($data)) {
    respond(400, false, 'Некоректні дані.');
}

// Приховане поле-пастка для найпростіших спам-ботів.
if (!empty($data['website'])) {
    respond(200, true, 'Заявку прийнято.');
}

$clean = static function ($value, int $maxLength = 500): string {
    $text = trim((string) $value);
    $text = strip_tags($text);
    $text = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $text) ?? '';
    return function_exists('mb_substr') ? mb_substr($text, 0, $maxLength, 'UTF-8') : substr($text, 0, $maxLength);
};

$name = $clean($data['name'] ?? '', 100);
$phoneRaw = $clean($data['phone'] ?? '', 30);
$phoneDigits = preg_replace('/\D/u', '', $phoneRaw) ?? '';
$message = $clean($data['message'] ?? '', 500);
$desiredSlot = $clean($data['desired_slot'] ?? '', 100);

if (strlen($phoneDigits) < 9) {
    respond(422, false, 'Вкажіть коректний номер телефону.');
}

$submittedAt = date('d.m.Y H:i');

// ЗАМІНІТЬ на реальну поштову скриньку клініки перед публікацією сайту.
$to = 'res_garmonia@ukr.net';
$subject = 'Нова заявка на прийом — педіатр';
$host = preg_replace('/[^a-z0-9.-]/i', '', $_SERVER['HTTP_HOST'] ?? 'example.com');
$from = 'no-reply@' . ($host ?: 'example.com');

$escape = static fn(string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$body = '<!doctype html><html lang="uk"><body style="font-family:Arial,sans-serif;color:#173a56">'
    . '<h2>Нова заявка на прийом — педіатр</h2>'
    . '<table cellpadding="9" cellspacing="0" border="1" style="border-collapse:collapse;border-color:#dbe7ee">'
    . '<tr><td><strong>Ім\u2019я</strong></td><td>' . ($name !== '' ? $escape($name) : '\u2014') . '</td></tr>'
    . '<tr><td><strong>Телефон</strong></td><td>' . $escape($phoneRaw) . '</td></tr>'
    . ($desiredSlot !== '' ? '<tr><td><strong>Бажаний час прийому</strong></td><td>' . $escape($desiredSlot) . '</td></tr>' : '')
    . '<tr><td><strong>Повідомлення</strong></td><td>' . ($message !== '' ? nl2br($escape($message)) : '&mdash;') . '</td></tr>'
    . '<tr><td><strong>Дата</strong></td><td>' . $submittedAt . '</td></tr>'
    . '<tr><td><strong>Сторінка</strong></td><td>' . $escape((string) ($_SERVER['HTTP_REFERER'] ?? '')) . '</td></tr>'
    . '</table></body></html>';

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'From: Сторінка педіатра <' . $from . '>',
    'Reply-To: ' . $to,
    'X-Mailer: PHP/' . PHP_VERSION,
];

$emailSent = @mail($to, $encodedSubject, $body, implode("\r\n", $headers));

// ==========================================================
// ВІДПРАВКА ЗАЯВОК У TELEGRAM
// Дані бота беруться з config.php (там же інструкція, як їх отримати).
// ==========================================================
$telegramConfig = @include __DIR__ . '/config.php';
$telegramBotToken = is_array($telegramConfig) ? (string) ($telegramConfig['telegram_bot_token'] ?? '') : '';
$telegramChatId = is_array($telegramConfig) ? (string) ($telegramConfig['telegram_chat_id'] ?? '') : '';

function sendTelegram(string $botToken, string $chatId, string $text): bool
{
    if ($botToken === '' || $chatId === '' || $botToken === 'PASTE_YOUR_BOT_TOKEN_HERE' || $chatId === 'PASTE_YOUR_CHAT_ID_HERE') {
        return false;
    }
    $url = 'https://api.telegram.org/bot' . $botToken . '/sendMessage';
    $payload = json_encode([
        'chat_id' => $chatId,
        'text' => $text,
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => true,
    ], JSON_UNESCAPED_UNICODE);

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
        ]);
        $result = curl_exec($ch);
        curl_close($ch);
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => 8,
                'ignore_errors' => true,
            ],
        ]);
        $result = @file_get_contents($url, false, $context);
    }

    if ($result === false || $result === null) {
        return false;
    }
    $decoded = json_decode((string) $result, true);
    return is_array($decoded) && !empty($decoded['ok']);
}

$telegramText = "<b>Педіатр — нова заявка на прийом</b>\n"
    . "\u{1F464} Ім'я: " . ($name !== '' ? htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : '—') . "\n"
    . "\u{1F4DE} Телефон: " . htmlspecialchars($phoneRaw, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "\n"
    . ($desiredSlot !== '' ? "\u{1F553} Бажаний час прийому: " . htmlspecialchars($desiredSlot, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . "\n" : '')
    . "\u{1F4DD} Повідомлення: " . ($message !== '' ? htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : '—') . "\n"
    . "\u{1F550} Дата: " . $submittedAt;

$telegramSent = sendTelegram($telegramBotToken, $telegramChatId, $telegramText);
if (!$telegramSent) {
    error_log('Medychna Harmoniya lead: Telegram delivery failed or not configured.');
}

function saveLeadCsv(string $path, array $row): bool
{
    $directory = dirname($path);
    if (!is_dir($directory) && !@mkdir($directory, 0775, true) && !is_dir($directory)) {
        return false;
    }
    $handle = @fopen($path, 'c+b');
    if ($handle === false) {
        return false;
    }
    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        return false;
    }
    fseek($handle, 0, SEEK_END);
    if (ftell($handle) === 0) {
        fwrite($handle, "\xEF\xBB\xBFsep=;\r\n");
        fputcsv($handle, ['Дата', 'Ім\u2019я', 'Телефон', 'Бажаний час прийому', 'Повідомлення'], ';', '"', '', "\r\n");
    }
    $safe = static fn(string $v): string => preg_match('/^[=+\-@]/u', $v) ? "'" . $v : $v;
    $result = fputcsv($handle, array_map($safe, array_map('strval', $row)), ';', '"', '', "\r\n");
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    return $result !== false;
}

$csvSaved = saveLeadCsv(__DIR__ . '/storage/leads.csv', [$submittedAt, $name, $phoneRaw, $desiredSlot, $message]);

if (!$emailSent) {
    error_log('Medychna Harmoniya lead: email delivery failed.');
}
if (!$csvSaved) {
    error_log('Medychna Harmoniya lead: CSV storage failed. Перевірте права доступу на storage/ (потрібно 775).');
}

if (!$emailSent && !$csvSaved && !$telegramSent) {
    respond(502, false, 'Сервер не зміг обробити заявку.', [
        'details' => [
            'email' => 'mail() повернув false — перевірте, чи налаштована відправка пошти на хостингу',
            'csv' => 'не вдалося записати у storage/leads.csv — перевірте права доступу (потрібно 775)',
            'telegram' => 'заявка не надійшла в Telegram — перевірте telegram_bot_token і telegram_chat_id у config.php',
        ],
    ]);
}

respond(200, true, 'Заявку успішно надіслано.');
