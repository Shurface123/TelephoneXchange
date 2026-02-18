<?php
class Database {
    private $host = 'localhost';
    private $db_name = 'cocobod_telephone_exchange';
    private $username = 'root';
    private $password = 'Confrontation@433';
    private $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            echo "Connection error: " . $exception->getMessage();
        }
        return $this->conn;
    }
}

// Global database connection
$database = new Database();
$db = $database->getConnection();
?>
