#!/usr/bin/env python3
"""
Process nh48.json to replace parentheses with dashes and periods.
Changes:
  - Replace ( with " - "
  - Replace ) with .
"""
import json
import re

def process_text(text):
    """Replace parentheses in text with dashes and periods."""
    if not isinstance(text, str):
        return text
    # Replace ( with " - "
    text = text.replace("(", " - ")
    # Replace ) with .
    text = text.replace(")", ".")
    return text

def process_value(value):
    """Recursively process values to handle strings, lists, and dicts."""
    if isinstance(value, str):
        return process_text(value)
    elif isinstance(value, dict):
        return {k: process_value(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [process_value(item) for item in value]
    else:
        return value

def main():
    # Read the JSON file
    with open('/workspaces/nh48-api/data/nh48.json', 'r') as f:
        data = json.load(f)
    
    # Process all peaks
    processed = {}
    for slug, peak_data in data.items():
        processed[slug] = process_value(peak_data)
    
    # Write back with nice formatting
    with open('/workspaces/nh48-api/data/nh48.json', 'w') as f:
        json.dump(processed, f, indent=2)
    
    print("✓ JSON processing complete. Parentheses replaced with dashes and periods.")

if __name__ == '__main__':
    main()
