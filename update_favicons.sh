#!/bin/bash

OLD_PATTERN='    <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="shortcut icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="manifest" href="/manifest.json">'

NEW_PATTERN='    <!-- Favicons - ICO format preferred for Google compatibility -->
    <link rel="icon" href="/favicons/favicon.ico" sizes="48x48">
    <link rel="icon" type="image/x-icon" href="/favicons/favicon.ico">
    <link rel="shortcut icon" href="/favicons/favicon.ico">
    <link rel="icon" type="image/x-icon" sizes="16x16" href="/favicons/favicon-16x16.ico">
    <link rel="icon" type="image/x-icon" sizes="32x32" href="/favicons/favicon-32x32.ico">
    <link rel="icon" type="image/x-icon" sizes="48x48" href="/favicons/favicon-48x48.ico">
    <link rel="icon" type="image/x-icon" sizes="96x96" href="/favicons/favicon-96x96.ico">
    <!-- PNG fallbacks for browsers that prefer PNG -->
    <link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32.png">
    <link rel="icon" type="image/png" sizes="48x48" href="/favicons/favicon-48x48.png">
    <link rel="icon" type="image/png" sizes="96x96" href="/favicons/favicon-96x96.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png">
    <link rel="manifest" href="/manifest.json">'

count=0
errors=0

for dir in /workspaces/nh48-api/fr/peaks/*/; do
    file="${dir}index.html"
    if [ -f "$file" ]; then
        # Read file content
        content=$(cat "$file")
        
        # Check if old pattern exists
        if echo "$content" | grep -q '<link rel="icon" href="/favicon.ico" sizes="any">'; then
            # Use perl for multiline replacement
            perl -i -0777 -pe 's/    <link rel="icon" href="\/favicon\.ico" sizes="any">\n  <link rel="shortcut icon" href="\/favicon\.ico">\n    <link rel="icon" type="image\/png" sizes="16x16" href="\/favicon-16\.png">\n    <link rel="icon" type="image\/png" sizes="32x32" href="\/favicon-32\.png">\n    <link rel="icon" type="image\/png" sizes="48x48" href="\/favicon-48x48\.png">\n    <link rel="icon" type="image\/png" sizes="96x96" href="\/favicon-96x96\.png">\n    <link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png">\n    <link rel="manifest" href="\/manifest\.json">/    <!-- Favicons - ICO format preferred for Google compatibility -->\n    <link rel="icon" href="\/favicons\/favicon.ico" sizes="48x48">\n    <link rel="icon" type="image\/x-icon" href="\/favicons\/favicon.ico">\n    <link rel="shortcut icon" href="\/favicons\/favicon.ico">\n    <link rel="icon" type="image\/x-icon" sizes="16x16" href="\/favicons\/favicon-16x16.ico">\n    <link rel="icon" type="image\/x-icon" sizes="32x32" href="\/favicons\/favicon-32x32.ico">\n    <link rel="icon" type="image\/x-icon" sizes="48x48" href="\/favicons\/favicon-48x48.ico">\n    <link rel="icon" type="image\/x-icon" sizes="96x96" href="\/favicons\/favicon-96x96.ico">\n    <!-- PNG fallbacks for browsers that prefer PNG -->\n    <link rel="icon" type="image\/png" sizes="16x16" href="\/favicons\/favicon-16.png">\n    <link rel="icon" type="image\/png" sizes="32x32" href="\/favicons\/favicon-32.png">\n    <link rel="icon" type="image\/png" sizes="48x48" href="\/favicons\/favicon-48x48.png">\n    <link rel="icon" type="image\/png" sizes="96x96" href="\/favicons\/favicon-96x96.png">\n    <link rel="apple-touch-icon" sizes="180x180" href="\/favicons\/apple-touch-icon.png">\n    <link rel="manifest" href="\/manifest.json">/g' "$file"
            
            if [ $? -eq 0 ]; then
                echo "Updated: $file"
                ((count++))
            else
                echo "Error updating: $file"
                ((errors++))
            fi
        else
            echo "Pattern not found: $file"
        fi
    fi
done

echo "---"
echo "Total files updated: $count"
echo "Errors: $errors"
