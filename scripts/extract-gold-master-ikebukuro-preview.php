<?php

/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md read-only Ikebukuro field-preview extraction
 * @related_to   scripts/legacy-preview-import.ts consumes separately transformed preview artifacts
 * @known_issues The approved legacy tables use MyISAM, so final cutover requires a coordinated write pause
 */

const LEGACY_CONFIG_PATH = '/home/nzuadtjn/gold-esthe.com_inc_master/jukunen_db_2016.inc';
const EXPECTED_DATABASE = 'nzuadtjn_gold_master';
const EXPECTED_CUSTOMER_DATABASE = 'nzuadtjn_primegb_master';
const SHOP_NO = 5600;

class LegacyPreviewExtractionException extends RuntimeException
{
}

try {
    runExtractor();
} catch (Throwable $error) {
    $diagnostic =
        getenv('LEGACY_PREVIEW_DIAGNOSTICS') === 'STAGE_ONLY' &&
        $error instanceof LegacyPreviewExtractionException
            ? ' at stage: ' . $error->getMessage()
            : '';
    file_put_contents('php://stderr', "Legacy preview extraction failed{$diagnostic}.\n");
    exit(1);
}

function runExtractor()
{
    $pdo = null;
    $transactionStarted = false;
    $stage = 'configuration';
    try {
        date_default_timezone_set('Asia/Tokyo');

        $extractKind = getenv('LEGACY_PREVIEW_EXTRACT_KIND');
        if ($extractKind === false || $extractKind === '') {
            $extractKind = 'gold-master-v4';
        }
        if ($extractKind !== 'gold-master-v4' && $extractKind !== 'cast-ledger') {
            throw new RuntimeException('Invalid extraction kind.');
        }

        $scheduleFrom = null;
        $scheduleTo = null;
        $reservationFrom = null;
        $ledgerFrom = null;
        if ($extractKind === 'cast-ledger') {
            $ledgerFrom = readIsoDateEnvironment('LEGACY_PREVIEW_LEDGER_FROM');
        } else {
            $scheduleFrom = readIsoDateEnvironment('LEGACY_PREVIEW_SCHEDULE_FROM');
            $scheduleTo = readIsoDateEnvironment('LEGACY_PREVIEW_SCHEDULE_TO');
            $reservationFrom = readIsoDateEnvironment('LEGACY_PREVIEW_RESERVATION_FROM');
            if ($scheduleFrom > $scheduleTo) {
                throw new RuntimeException('Invalid schedule range.');
            }
        }

        $connection = parseJukunenConnectionConfig(LEGACY_CONFIG_PATH);
        if ($connection['database'] !== EXPECTED_DATABASE) {
            throw new RuntimeException('Unexpected legacy database.');
        }

        $stage = 'connection';
        $pdo = new PDO(
            'mysql:host=' . $connection['host'] . ';dbname=' . $connection['database'] . ';charset=utf8mb4',
            $connection['username'],
            $connection['password'],
            array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            )
        );
        $pdo->exec('SET SESSION TRANSACTION READ ONLY');
        $pdo->exec('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');

        $stage = 'source-identity';
        $readOnlyMode = $pdo->query('SELECT @@session.tx_read_only AS read_only_mode')->fetchColumn();
        $selectedDatabase = $pdo->query('SELECT DATABASE() AS database_name')->fetchColumn();
        if ((int) $readOnlyMode !== 1 || $selectedDatabase !== EXPECTED_DATABASE) {
            throw new RuntimeException('Legacy source safety gate failed.');
        }

        $stage = 'transaction-start';
        $pdo->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT');
        $transactionStarted = true;
        $capturedAt = (new DateTimeImmutable('now', new DateTimeZone('Asia/Tokyo')))->format(DATE_ATOM);
        if (getenv('LEGACY_PREVIEW_DIAGNOSTICS') === 'SCHEMA_ONLY') {
            $stage = 'schema-only';
            $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
            $matched = array();
            foreach ($tables as $table) {
                if (
                    !is_string($table) ||
                    !preg_match('/^(office_pay|nyukin|shukkin|shop_list|nyukin_[0-9]{4}|shukkin_[0-9]{4})$/D', $table)
                ) {
                    continue;
                }
                $matched[] = $table;
            }
            echo json_encode($matched, JSON_UNESCAPED_SLASHES) . "\n";
            $pdo->exec('COMMIT');
            $transactionStarted = false;
            return;
        }

        $stage = 'dataset-extraction';
        $queries =
            $extractKind === 'cast-ledger'
                ? buildLedgerDatasetQueries($pdo, $ledgerFrom)
                : buildDatasetQueries($scheduleFrom, $scheduleTo, $reservationFrom);
        $beforeCounts = collectCounts($pdo, $queries);
        $rows = collectRows($pdo, $queries);
        $afterCounts = collectCounts($pdo, $queries);
        $snapshot =
            $extractKind === 'cast-ledger'
                ? buildLedgerSnapshot($capturedAt, $ledgerFrom, $beforeCounts, $afterCounts, $rows)
                : array(
                    'version' => 4,
                    'scope' => array(
                        'sourceDatabase' => EXPECTED_DATABASE,
                        'customerSourceDatabase' => EXPECTED_CUSTOMER_DATABASE,
                        'shopNo' => SHOP_NO,
                        'cutoffAt' => $capturedAt,
                        'scheduleFrom' => $scheduleFrom,
                        'scheduleTo' => $scheduleTo,
                        'reservationFrom' => $reservationFrom,
                        'consistency' => 'best-effort-read-only-count-checked',
                    ),
                    'beforeCounts' => canonicalizeDatasets($beforeCounts),
                    'afterCounts' => canonicalizeDatasets($afterCounts),
                    'rows' => canonicalizeDatasets($rows),
                );

        $stage = 'snapshot-encoding';
        $json = json_encode(
            $snapshot,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
        );
        if (!is_string($json)) {
            throw new RuntimeException('Snapshot encoding failed.');
        }

        $stage = 'transaction-commit';
        $pdo->exec('COMMIT');
        $transactionStarted = false;
        echo $json . "\n";
    } catch (Throwable $error) {
        if ($pdo instanceof PDO && $transactionStarted) {
            try {
                $pdo->exec('ROLLBACK');
            } catch (Throwable $rollbackError) {
                throw new LegacyPreviewExtractionException(
                    'transaction-rollback',
                    0,
                    $rollbackError
                );
            }
        }
        if ($error instanceof LegacyPreviewExtractionException) {
            throw $error;
        }
        throw new LegacyPreviewExtractionException($stage, 0, $error);
    }
}

function readIsoDateEnvironment($name)
{
    $value = getenv($name);
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value)) {
        throw new RuntimeException('Invalid extraction cutoff.');
    }

    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('Asia/Tokyo'));
    $errors = DateTimeImmutable::getLastErrors();
    if (
        $date === false ||
        ($errors !== false && ($errors['warning_count'] !== 0 || $errors['error_count'] !== 0)) ||
        $date->format('Y-m-d') !== $value
    ) {
        throw new RuntimeException('Invalid extraction cutoff.');
    }

    return $value;
}

function parseJukunenConnectionConfig($path)
{
    if (!is_readable($path)) {
        throw new RuntimeException('Legacy configuration is unavailable.');
    }

    $source = file_get_contents($path);
    if (!is_string($source)) {
        throw new RuntimeException('Legacy configuration is unavailable.');
    }

    $tokens = token_get_all($source);
    $functionStart = findNamedFunctionBody($tokens, 'DB_jukunen');
    $arguments = findLiteralCallArguments($tokens, $functionStart, 'connectDB');
    if (count($arguments) < 4) {
        throw new RuntimeException('Legacy connection configuration is invalid.');
    }

    $connection = array(
        'host' => decodePhpStringLiteral($arguments[0]),
        'database' => decodePhpStringLiteral($arguments[1]),
        'username' => decodePhpStringLiteral($arguments[2]),
        'password' => decodePhpStringLiteral($arguments[3]),
    );
    foreach ($connection as $value) {
        if (!is_string($value) || $value === '') {
            throw new RuntimeException('Legacy connection configuration is invalid.');
        }
    }

    return $connection;
}

function findNamedFunctionBody($tokens, $functionName)
{
    $tokenCount = count($tokens);
    for ($index = 0; $index < $tokenCount; $index++) {
        $token = $tokens[$index];
        if (!is_array($token) || $token[0] !== T_FUNCTION) {
            continue;
        }

        $nameIndex = nextSignificantTokenIndex($tokens, $index + 1);
        if ($nameIndex === null) {
            break;
        }
        $nameToken = $tokens[$nameIndex];
        if (!is_array($nameToken) || $nameToken[0] !== T_STRING || $nameToken[1] !== $functionName) {
            continue;
        }

        for ($bodyIndex = $nameIndex + 1; $bodyIndex < $tokenCount; $bodyIndex++) {
            if ($tokens[$bodyIndex] === '{') {
                return $bodyIndex;
            }
        }
    }

    throw new RuntimeException('Legacy connection function is unavailable.');
}

function findLiteralCallArguments($tokens, $functionBodyStart, $callName)
{
    $tokenCount = count($tokens);
    $bodyDepth = 1;
    for ($index = $functionBodyStart + 1; $index < $tokenCount; $index++) {
        $token = $tokens[$index];
        if ($token === '{') {
            $bodyDepth++;
            continue;
        }
        if ($token === '}') {
            $bodyDepth--;
            if ($bodyDepth === 0) {
                break;
            }
            continue;
        }
        if (!is_array($token) || $token[0] !== T_STRING || $token[1] !== $callName) {
            continue;
        }

        $openIndex = nextSignificantTokenIndex($tokens, $index + 1);
        if ($openIndex === null || $tokens[$openIndex] !== '(') {
            continue;
        }

        return parseLiteralArguments($tokens, $openIndex);
    }

    throw new RuntimeException('Legacy connection call is unavailable.');
}

function parseLiteralArguments($tokens, $openIndex)
{
    $arguments = array();
    $current = array();
    $depth = 1;
    $tokenCount = count($tokens);

    for ($index = $openIndex + 1; $index < $tokenCount; $index++) {
        $token = $tokens[$index];
        if ($token === '(') {
            $depth++;
            $current[] = $token;
            continue;
        }
        if ($token === ')') {
            $depth--;
            if ($depth === 0) {
                $arguments[] = requireSingleLiteralArgument($current);
                return $arguments;
            }
            $current[] = $token;
            continue;
        }
        if ($token === ',' && $depth === 1) {
            $arguments[] = requireSingleLiteralArgument($current);
            $current = array();
            continue;
        }
        $current[] = $token;
    }

    throw new RuntimeException('Legacy connection call is incomplete.');
}

function requireSingleLiteralArgument($argumentTokens)
{
    $significant = array();
    foreach ($argumentTokens as $token) {
        if (is_array($token) && in_array($token[0], array(T_WHITESPACE, T_COMMENT, T_DOC_COMMENT), true)) {
            continue;
        }
        $significant[] = $token;
    }

    if (count($significant) === 1 && is_array($significant[0]) && $significant[0][0] === T_CONSTANT_ENCAPSED_STRING) {
        return $significant[0][1];
    }

    return '';
}

function decodePhpStringLiteral($literal)
{
    if (!is_string($literal) || strlen($literal) < 2) {
        throw new RuntimeException('Legacy connection literal is invalid.');
    }

    $quote = $literal[0];
    if ($literal[strlen($literal) - 1] !== $quote || ($quote !== "'" && $quote !== '"')) {
        throw new RuntimeException('Legacy connection literal is invalid.');
    }

    $body = substr($literal, 1, -1);
    if ($quote === "'") {
        return str_replace(array('\\\\', "\\'"), array('\\', "'"), $body);
    }

    return stripcslashes($body);
}

function nextSignificantTokenIndex($tokens, $start)
{
    $tokenCount = count($tokens);
    for ($index = $start; $index < $tokenCount; $index++) {
        $token = $tokens[$index];
        if (is_array($token) && in_array($token[0], array(T_WHITESPACE, T_COMMENT, T_DOC_COMMENT), true)) {
            continue;
        }
        return $index;
    }

    return null;
}

function buildDatasetQueries($scheduleFrom, $scheduleTo, $reservationFrom)
{
    $shopParameters = array(':shopNo' => SHOP_NO);
    $activeCastParameters = array(':shopNo' => SHOP_NO);
    $scheduleParameters = array(
        ':shopNo' => SHOP_NO,
        ':activeShopNo' => SHOP_NO,
        ':scheduleFrom' => $scheduleFrom,
        ':scheduleTo' => $scheduleTo,
    );
    $reservationParameters = array(
        ':shopNo' => SHOP_NO,
        ':activeShopNo' => SHOP_NO,
        ':reservationFrom' => $reservationFrom,
        ':reservationFromMonth' => $reservationFrom,
    );
    $officePayParameters = array(
        ':shopNo' => SHOP_NO,
        ':activeShopNo' => SHOP_NO,
        ':reservationFrom' => $reservationFrom,
    );
    $reviewParameters = array(':shopNo' => SHOP_NO, ':activeShopNo' => SHOP_NO);
    $customerParameters = array(
        ':memberShopNo' => SHOP_NO,
        ':memberOrderShopNo' => SHOP_NO,
        ':memberReviewShopNo' => SHOP_NO,
    );
    $areaParameters = array(
        ':stationShopNo' => SHOP_NO,
        ':orderShopNo' => SHOP_NO,
        ':activeShopNo' => SHOP_NO,
        ':reservationFrom' => $reservationFrom,
        ':hotelCityShopNo' => SHOP_NO,
        ':hotelCity2ShopNo' => SHOP_NO,
    );
    $referencedLocationParameters = array(
        ':shopNo' => SHOP_NO,
        ':orderShopNo' => SHOP_NO,
        ':activeShopNo' => SHOP_NO,
        ':reservationFrom' => $reservationFrom,
    );

    return array(
        'shopList' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM shop_list WHERE shop_no = :shopNo',
            'rows' => '/* dataset:shopList */ SELECT shop_no, shop_name, tel, adress, eigyo, mail_ad, lev, girls_jikyu FROM shop_list WHERE shop_no = :shopNo ORDER BY shop_no',
            'params' => $shopParameters,
        ),
        'chargeInfo' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM charge_info WHERE flg_show = 1',
            'rows' => '/* dataset:chargeInfo */ SELECT id, sort, charge_name, charge_name_admin, charge_kin, charge_ara, charge_min, flg_show, flg_web FROM charge_info WHERE flg_show = 1 ORDER BY sort, id',
            'params' => array(),
        ),
        'options' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM options',
            'rows' => '/* dataset:options */ SELECT serial, sort, option_name, kin, girl_pay, lev, lev_admin FROM options ORDER BY sort, serial',
            'params' => array(),
        ),
        'optionsFree' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM options_free',
            'rows' => '/* dataset:optionsFree */ SELECT serial, sort, option_name, kin, lev, lev_admin FROM options_free ORDER BY sort, serial',
            'params' => array(),
        ),
        'cityList' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM city_list c WHERE c.serial IN (SELECT DISTINCT s.city_no FROM station_list_2018 s WHERE s.shop_no = :stationShopNo AND s.lev = 1) OR c.serial IN (SELECT DISTINCT o.city_no FROM orders o WHERE o.shop_no = :orderShopNo AND o.deli_date >= :reservationFrom AND o.lev BETWEEN -2 AND 3 AND o.course IN (SELECT id FROM charge_info WHERE flg_show = 1) AND o.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1)) OR c.serial IN (SELECT DISTINCT h.city_no FROM hotel_list h WHERE h.shop_no = :hotelCityShopNo AND h.city_no > 0) OR c.serial IN (SELECT DISTINCT h.city_no2 FROM hotel_list h WHERE h.shop_no = :hotelCity2ShopNo AND h.city_no2 > 0)',
            'rows' => '/* dataset:cityList */ SELECT c.serial, c.pref_no, c.city_name, c.sort, c.group_no, c.lev FROM city_list c WHERE c.serial IN (SELECT DISTINCT s.city_no FROM station_list_2018 s WHERE s.shop_no = :stationShopNo AND s.lev = 1) OR c.serial IN (SELECT DISTINCT o.city_no FROM orders o WHERE o.shop_no = :orderShopNo AND o.deli_date >= :reservationFrom AND o.lev BETWEEN -2 AND 3 AND o.course IN (SELECT id FROM charge_info WHERE flg_show = 1) AND o.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1)) OR c.serial IN (SELECT DISTINCT h.city_no FROM hotel_list h WHERE h.shop_no = :hotelCityShopNo AND h.city_no > 0) OR c.serial IN (SELECT DISTINCT h.city_no2 FROM hotel_list h WHERE h.shop_no = :hotelCity2ShopNo AND h.city_no2 > 0) ORDER BY c.sort, c.serial',
            'params' => $areaParameters,
        ),
        'stationList' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM station_list_2018 s WHERE s.shop_no = :shopNo AND (s.lev = 1 OR s.serial IN (SELECT DISTINCT o.station_no FROM orders o WHERE o.shop_no = :orderShopNo AND o.deli_date >= :reservationFrom AND o.lev BETWEEN -2 AND 3 AND o.course IN (SELECT id FROM charge_info WHERE flg_show = 1) AND o.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1)))',
            'rows' => '/* dataset:stationList */ SELECT s.serial, s.shop_no, s.pref_no, s.city_no, s.station_name, s.kana, s.sort, s.traffic_kin, s.lev, s.hp_flg FROM station_list_2018 s WHERE s.shop_no = :shopNo AND (s.lev = 1 OR s.serial IN (SELECT DISTINCT o.station_no FROM orders o WHERE o.shop_no = :orderShopNo AND o.deli_date >= :reservationFrom AND o.lev BETWEEN -2 AND 3 AND o.course IN (SELECT id FROM charge_info WHERE flg_show = 1) AND o.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1))) ORDER BY s.sort, s.serial',
            'params' => $referencedLocationParameters,
        ),
        'hotelGroup' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM hotel_area ha WHERE ha.shop_no = :shopNo',
            'rows' => '/* dataset:hotelGroup */ SELECT ha.serial, ha.shop_no, ha.pref_no, ha.area_name, ha.lev FROM hotel_area ha WHERE ha.shop_no = :shopNo ORDER BY ha.serial',
            'params' => $shopParameters,
        ),
        'hotelList' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM hotel_list h WHERE h.shop_no = :shopNo AND (h.lev = 1 OR h.serial IN (SELECT DISTINCT o.place_h_no FROM orders o WHERE o.shop_no = :orderShopNo AND o.deli_date >= :reservationFrom AND o.lev BETWEEN -2 AND 3 AND o.course IN (SELECT id FROM charge_info WHERE flg_show = 1) AND o.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1)))',
            'rows' => '/* dataset:hotelList */ SELECT h.serial, h.area_no, h.shop_no, h.pref_no, h.city_no, h.city_no2, h.hotel_name, h.station, h.address, h.tel, h.price1, h.price2, h.price3, h.price4, h.cm, h.lev FROM hotel_list h WHERE h.shop_no = :shopNo AND (h.lev = 1 OR h.serial IN (SELECT DISTINCT o.place_h_no FROM orders o WHERE o.shop_no = :orderShopNo AND o.deli_date >= :reservationFrom AND o.lev BETWEEN -2 AND 3 AND o.course IN (SELECT id FROM charge_info WHERE flg_show = 1) AND o.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1))) ORDER BY h.serial',
            'params' => $referencedLocationParameters,
        ),
        'girls' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM girls g WHERE g.shop_no = :shopNo AND g.lev = 2 AND g.lev_admin != 1',
            'rows' => '/* dataset:girls */ SELECT g.girl_no, g.shop_no, g.name, g.age, g.regist_date, g.p_height, g.p_bust, g.p_bust_cup, g.p_waist, g.p_hip, g.p_type, g.profile_catch, g.profile_cm, g.profile_new_1, g.profile_new_2, g.profile_new_3, g.profile_new_4, g.profile_new_5, g.profile_new_6, g.photo_1, g.photo_2, g.photo_3, g.photo_4, g.photo_5, g.photo_6, g.photo_7, g.photo_8, g.photo_9, g.photo_10, g.photo_11, g.photo_12, g.photo_13, g.photo_14, g.photo_15, g.access_count, g.options, g.options_free FROM girls g WHERE g.shop_no = :shopNo AND g.lev = 2 AND g.lev_admin != 1 ORDER BY g.girl_no',
            'params' => $activeCastParameters,
        ),
        'yotei' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM yotei y WHERE y.shop_no = :shopNo AND y.syu_date BETWEEN :scheduleFrom AND :scheduleTo AND y.work >= 3 AND y.work NOT IN (6, 9) AND y.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1)',
            'rows' => '/* dataset:yotei */ SELECT y.serial, y.syu_date, y.shop_no, y.girl_no, y.work, y.work1, y.work2, y.work3, y.work4, y.flg_work FROM yotei y WHERE y.shop_no = :shopNo AND y.syu_date BETWEEN :scheduleFrom AND :scheduleTo AND y.work >= 3 AND y.work NOT IN (6, 9) AND y.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) ORDER BY y.syu_date, y.girl_no, y.serial',
            'params' => $scheduleParameters,
        ),
        'orders' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM orders o WHERE o.shop_no = :shopNo AND o.deli_date >= :reservationFrom AND o.lev BETWEEN -2 AND 3 AND o.course IN (SELECT id FROM charge_info WHERE flg_show = 1) AND o.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1)',
            'rows' => '/* dataset:orders */ SELECT o.serial, o.shop_no, o.girl_no, o.deli_date, o.mem_id, o.time_h, o.time_m, o.course, o.course_time, o.course_kin, o.course2_kin, o.course3_kin, o.simei_kind, o.simei_kin, o.koutu, o.hotel_kin, o.nebiki_kin, o.nebiki_kin_point, o.total, o.ara, o.girl_pay, o.lev, o.nyu_date, o.pay_kind, o.media, o.options, o.options_free, o.pref_no, o.city_no, o.station_no, o.place_h_no FROM orders o WHERE o.shop_no = :shopNo AND o.deli_date >= :reservationFrom AND o.lev BETWEEN -2 AND 3 AND o.course IN (SELECT id FROM charge_info WHERE flg_show = 1) AND o.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) ORDER BY o.deli_date, o.time_h, o.time_m, o.serial',
            'params' => $reservationParameters,
        ),
        'userVoice' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM user_voice v WHERE v.shop_no = :shopNo AND v.lev = 1 AND v.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1)',
            'rows' => '/* dataset:userVoice */ SELECT v.serial, v.shop_no, v.mem_id, v.girl_no, v.order_no, v.add_date, v.h_lev, v.cm, v.lev FROM user_voice v WHERE v.shop_no = :shopNo AND v.lev = 1 AND v.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) ORDER BY v.add_date, v.serial',
            'params' => $reviewParameters,
        ),
        'members' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM nzuadtjn_primegb_master.member m WHERE m.shop_no = :memberShopNo OR m.mem_id IN (SELECT DISTINCT o.mem_id FROM orders o WHERE o.shop_no = :memberOrderShopNo AND o.mem_id > 0) OR m.mem_id IN (SELECT DISTINCT v.mem_id FROM user_voice v WHERE v.shop_no = :memberReviewShopNo AND v.mem_id > 0)',
            'rows' => '/* dataset:members */ SELECT m.mem_id, m.shop_no, m.name, m.tel, m.mail_ad, m.birth, m.age, m.point, m.lev_member, m.lev, m.lev_admin, m.flg_smail, m.regist_date, m.regist_date_new, m.login_date, m.deli_date FROM nzuadtjn_primegb_master.member m WHERE m.shop_no = :memberShopNo OR m.mem_id IN (SELECT DISTINCT o.mem_id FROM orders o WHERE o.shop_no = :memberOrderShopNo AND o.mem_id > 0) OR m.mem_id IN (SELECT DISTINCT v.mem_id FROM user_voice v WHERE v.shop_no = :memberReviewShopNo AND v.mem_id > 0) ORDER BY m.mem_id',
            'params' => $customerParameters,
        ),
        'nyukin' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM nyukin n WHERE n.shop_no = :shopNo AND n.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) AND (n.nyu_date >= :reservationFrom OR n.nyu_month >= :reservationFromMonth)',
            'rows' => '/* dataset:nyukin */ SELECT n.serial, n.shop_no, n.nyu_date, n.nyu_month, n.girl_no, n.kin, n.kind FROM nyukin n WHERE n.shop_no = :shopNo AND n.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) AND (n.nyu_date >= :reservationFrom OR n.nyu_month >= :reservationFromMonth) ORDER BY n.nyu_date, n.serial',
            'params' => $reservationParameters,
        ),
        'shukkin' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM shukkin s WHERE s.shop_no = :shopNo AND s.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) AND (s.nyu_date >= :reservationFrom OR s.nyu_month >= :reservationFromMonth)',
            'rows' => '/* dataset:shukkin */ SELECT s.serial, s.shop_no, s.nyu_date, s.nyu_month, s.girl_no, s.kin, s.kind FROM shukkin s WHERE s.shop_no = :shopNo AND s.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) AND (s.nyu_date >= :reservationFrom OR s.nyu_month >= :reservationFromMonth) ORDER BY s.nyu_date, s.serial',
            'params' => $reservationParameters,
        ),
        'officePay' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM office_pay p WHERE p.shop_no = :shopNo AND p.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) AND p.job_date >= :reservationFrom',
            'rows' => '/* dataset:officePay */ SELECT p.serial, p.shop_no, p.job_date, p.girl_no, p.kin FROM office_pay p WHERE p.shop_no = :shopNo AND p.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) AND p.job_date >= :reservationFrom ORDER BY p.job_date, p.girl_no',
            'params' => $officePayParameters,
        ),
    );
}

function cashbookTableExists($pdo, $tableName)
{
    if (!preg_match('/^(nyukin|shukkin)(?:_[0-9]{4})?$/D', $tableName)) {
        throw new RuntimeException('Unexpected cashbook table.');
    }
    $statement = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :tableName'
    );
    $statement->bindValue(':tableName', $tableName, PDO::PARAM_STR);
    $statement->execute();
    return (int) $statement->fetchColumn() === 1;
}

function tagCashbookSourceTable($rows, $tableName)
{
    $tagged = array();
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $row['source_table'] = $tableName;
        $tagged[] = $row;
    }
    return $tagged;
}

function mergeLedgerPayments($rows)
{
    $payments = tagCashbookSourceTable(
        isset($rows['nyukin']) && is_array($rows['nyukin']) ? $rows['nyukin'] : array(),
        'nyukin'
    );
    foreach ($rows as $dataset => $value) {
        if (!preg_match('/^nyukin_[0-9]{4}$/D', $dataset) || !is_array($value)) {
            continue;
        }
        $payments = array_merge($payments, tagCashbookSourceTable($value, $dataset));
    }
    return $payments;
}

function buildLedgerDatasetQueries($pdo, $ledgerFrom)
{
    $shopParameters = array(':shopNo' => SHOP_NO);
    $ledgerParameters = array(
        ':shopNo' => SHOP_NO,
        ':activeShopNo' => SHOP_NO,
        ':reservationFrom' => $ledgerFrom,
        ':reservationFromMonth' => $ledgerFrom,
    );
    $officePayParameters = array(
        ':shopNo' => SHOP_NO,
        ':activeShopNo' => SHOP_NO,
        ':reservationFrom' => $ledgerFrom,
    );

    $queries = array(
        'shopGuarantee' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM shop_list WHERE shop_no = :shopNo',
            'rows' => '/* dataset:shopGuarantee */ SELECT shop_no, girls_jikyu FROM shop_list WHERE shop_no = :shopNo ORDER BY shop_no',
            'params' => $shopParameters,
        ),
        'nyukin' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM nyukin n WHERE n.shop_no = :shopNo AND n.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) AND (n.nyu_date >= :reservationFrom OR n.nyu_month >= :reservationFromMonth)',
            'rows' => '/* dataset:nyukin */ SELECT n.serial, n.shop_no, n.nyu_date, n.nyu_month, n.girl_no, n.kin, n.kind FROM nyukin n WHERE n.shop_no = :shopNo AND n.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) AND (n.nyu_date >= :reservationFrom OR n.nyu_month >= :reservationFromMonth) ORDER BY n.nyu_date, n.serial',
            'params' => $ledgerParameters,
        ),
        'shukkin' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM shukkin s WHERE s.shop_no = :shopNo AND s.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) AND (s.nyu_date >= :reservationFrom OR s.nyu_month >= :reservationFromMonth)',
            'rows' => '/* dataset:shukkin */ SELECT s.serial, s.shop_no, s.nyu_date, s.nyu_month, s.girl_no, s.kin, s.kind FROM shukkin s WHERE s.shop_no = :shopNo AND s.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) AND (s.nyu_date >= :reservationFrom OR s.nyu_month >= :reservationFromMonth) ORDER BY s.nyu_date, s.serial',
            'params' => $ledgerParameters,
        ),
        'officePay' => array(
            'count' => 'SELECT COUNT(*) AS row_count FROM office_pay p WHERE p.shop_no = :shopNo AND p.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) AND p.job_date >= :reservationFrom',
            'rows' => '/* dataset:officePay */ SELECT p.serial, p.shop_no, p.job_date, p.girl_no, p.kin FROM office_pay p WHERE p.shop_no = :shopNo AND p.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) AND p.job_date >= :reservationFrom ORDER BY p.job_date, p.girl_no',
            'params' => $officePayParameters,
        ),
    );

    $fromYear = (int) substr($ledgerFrom, 0, 4);
    $toYear = (int) (new DateTimeImmutable('now', new DateTimeZone('Asia/Tokyo')))->format('Y');
    for ($year = $fromYear; $year <= $toYear; $year++) {
        $tableName = 'nyukin_' . $year;
        if (!cashbookTableExists($pdo, $tableName)) {
            continue;
        }
        $quotedTable = '`' . $tableName . '`';
        $queries[$tableName] = array(
            'count' =>
                'SELECT COUNT(*) AS row_count FROM ' .
                $quotedTable .
                ' n WHERE n.shop_no = :shopNo AND n.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) AND (n.nyu_date >= :reservationFrom OR n.nyu_month >= :reservationFromMonth)',
            'rows' =>
                '/* dataset:' .
                $tableName .
                ' */ SELECT n.serial, n.shop_no, n.nyu_date, n.nyu_month, n.girl_no, n.kin, n.kind FROM ' .
                $quotedTable .
                ' n WHERE n.shop_no = :shopNo AND n.girl_no IN (SELECT g.girl_no FROM girls g WHERE g.shop_no = :activeShopNo AND g.lev = 2 AND g.lev_admin != 1) AND (n.nyu_date >= :reservationFrom OR n.nyu_month >= :reservationFromMonth) ORDER BY n.nyu_date, n.serial',
            'params' => $ledgerParameters,
        );
    }

    return $queries;
}

function canonicalizeLedgerDatasets($datasets)
{
    $payments = (int) $datasets['nyukin'];
    foreach ($datasets as $dataset => $value) {
        if (preg_match('/^nyukin_[0-9]{4}$/D', $dataset)) {
            $payments += (int) $value;
        }
    }

    return array(
        'stores' => $datasets['shopGuarantee'],
        'payments' => $payments,
        'withdrawals' => $datasets['shukkin'],
        'welfareDeductions' => $datasets['officePay'],
    );
}

function buildLedgerSnapshot($capturedAt, $ledgerFrom, $beforeCounts, $afterCounts, $rows)
{
    if (!isset($rows['shopGuarantee']) || count($rows['shopGuarantee']) !== 1) {
        throw new RuntimeException('Unexpected shop guarantee row count.');
    }
    $store = $rows['shopGuarantee'][0];
    if (!isset($store['shop_no'], $store['girls_jikyu'])) {
        throw new RuntimeException('Unexpected shop guarantee projection.');
    }

    return array(
        'version' => 1,
        'kind' => 'ikebukuro-cast-ledger',
        'scope' => array(
            'sourceDatabase' => EXPECTED_DATABASE,
            'shopNo' => SHOP_NO,
            'cutoffAt' => $capturedAt,
            'ledgerFrom' => $ledgerFrom,
            'consistency' => 'best-effort-read-only-count-checked',
        ),
        'beforeCounts' => canonicalizeLedgerDatasets($beforeCounts),
        'afterCounts' => canonicalizeLedgerDatasets($afterCounts),
        'store' => array(
            'shop_no' => (int) $store['shop_no'],
            'girls_jikyu' => (int) $store['girls_jikyu'],
        ),
        'rows' => array(
            'payments' => mergeLedgerPayments($rows),
            'withdrawals' => $rows['shukkin'],
            'welfareDeductions' => $rows['officePay'],
        ),
    );
}

function canonicalizeDatasets($datasets)
{
    return array(
        'stores' => $datasets['shopList'],
        'courses' => $datasets['chargeInfo'],
        'paidOptions' => $datasets['options'],
        'freeOptions' => $datasets['optionsFree'],
        'areas' => $datasets['cityList'],
        'stations' => $datasets['stationList'],
        'hotelGroups' => $datasets['hotelGroup'],
        'hotels' => $datasets['hotelList'],
        'casts' => $datasets['girls'],
        'schedules' => $datasets['yotei'],
        'reservations' => $datasets['orders'],
        'reviews' => $datasets['userVoice'],
        'customers' => $datasets['members'],
        'payments' => $datasets['nyukin'],
        'withdrawals' => $datasets['shukkin'],
        'welfareDeductions' => $datasets['officePay'],
    );
}

function collectCounts($pdo, $queries)
{
    $counts = array();
    foreach ($queries as $dataset => $query) {
        try {
            $statement = prepareAndExecute($pdo, $query['count'], $query['params']);
            $counts[$dataset] = (int) $statement->fetchColumn();
        } catch (Throwable $error) {
            throw new LegacyPreviewExtractionException('dataset-count-' . $dataset, 0, $error);
        }
    }
    return $counts;
}

function collectRows($pdo, $queries)
{
    $rows = array();
    foreach ($queries as $dataset => $query) {
        try {
            $statement = prepareAndExecute($pdo, $query['rows'], $query['params']);
            $rows[$dataset] = $statement->fetchAll(PDO::FETCH_ASSOC);
        } catch (Throwable $error) {
            throw new LegacyPreviewExtractionException('dataset-rows-' . $dataset, 0, $error);
        }
    }
    return $rows;
}

function prepareAndExecute($pdo, $sql, $parameters)
{
    $statement = $pdo->prepare($sql);
    foreach ($parameters as $name => $value) {
        $statement->bindValue($name, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $statement->execute();
    return $statement;
}
