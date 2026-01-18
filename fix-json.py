#!/usr/bin/env python3
"""Fix the long-trails-full.json file by removing leftover merge conflict content."""

import os

file_path = 'data/long-trails-full.json'

with open(file_path, 'r') as f:
    lines = f.readlines()

print(f'Original file has {len(lines)} lines')

# Keep only the first 44310 lines
with open(file_path, 'w') as f:
    f.writelines(lines[:44310])

print('File truncated to 44310 lines')

# Verify
with open(file_path, 'r') as f:
    new_lines = f.readlines()
    print(f'New file has {len(new_lines)} lines')
    print('Last 3 lines:')
    for line in new_lines[-3:]:
        print(repr(line))
