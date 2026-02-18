<?php
$page_title = 'Unauthorized Access - COCOBOD CHED Telephone Exchange';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $page_title; ?></title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="assets/css/components.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: var(--background-color);">
        <div style="text-align: center; max-width: 500px; padding: 2rem;">
            <div style="font-size: 4rem; color: var(--danger-color); margin-bottom: 1rem;">
                <i class="fas fa-ban"></i>
            </div>
            <h1 style="font-size: 2rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem;">
                Access Denied
            </h1>
            <p style="color: var(--text-secondary); margin-bottom: 2rem; line-height: 1.6;">
                You don't have permission to access this page. Please contact your administrator if you believe this is an error.
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <a href="javascript:history.back()" class="btn btn-secondary">
                    <i class="fas fa-arrow-left"></i> Go Back
                </a>
                <a href="index.php?page=dashboard" class="btn btn-primary">
                    <i class="fas fa-home"></i> Dashboard
                </a>
            </div>
        </div>
    </div>
</body>
</html>
