<?php

class Clickr {
    private $db;
    private $clickr_id;

    public function __construct($clickr_id) {
        try {
            $this->db = new PDO('mysql:host=127.0.0.1;dbname=clickr_development', 'root', '');
        } catch (PDOException $e) {
            trigger_error($e->getMessage(), E_USER_ERROR);
        }

        $this->clickr_id = $clickr_id;
    }

    public function serve_tags() {
        $site = $this->fetch_site_by_clickr_id($this->clickr_id);
        if ($site) {
            return json_encode(array(
                'ad_unit_billboard' => $site['ad_unit_billboard'],
                'analytics'         => $site['analytics'],
                'comscore'          => $site['comscore'],
                'krux'              => $site['krux'],
                'krux_control'      => $site['krux_control'],
                'leaderboard_top'   => $site['leaderboard_top'],
                'body_style'        => ''
            ));
        } else {
            return json_encode(array());
        }
    }

    private function fetch_site_by_clickr_id($clickr_id) {
        $site = $this->db->prepare("select * from sites where public_id = :clickr_id");
        $site->bindParam(':clickr_id', $clickr_id, PDO::PARAM_STR, 5);
        $site->execute();
        return $site->fetch();
    }
}

$clickr = new Clickr($_REQUEST['clickr_id'] ? $_REQUEST['clickr_id'] : $_POST['clickr_id']);

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
die($clickr->serve_tags());