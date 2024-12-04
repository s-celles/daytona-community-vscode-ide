import os
from datetime import datetime
from zoneinfo import ZoneInfo  # For Python 3.9+
import argparse
from tzlocal import get_localzone  # Install with `pip install tzlocal`

def read_file_safely(file_path):
    """Try to read a file with different encodings."""
    encodings = ['utf-8', 'utf-16', 'cp1252', 'iso-8859-1']
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"Error reading {file_path}: {str(e)}")
            return f"### ERROR: Could not read file {file_path} ###"
    
    return f"### ERROR: Could not decode {file_path} with any of the attempted encodings ###"

def find_and_print_files(timestamp, extensions, exclude_paths, output_file):
    with open(output_file, 'w', encoding='utf-8') as output_file_handle:
        output_file_handle.write("#" * 4 + f" {timestamp} " + "#" * 4 + "\n")
        for root, dirs, files in os.walk("."):
            for file in files:
                if file.endswith(tuple(extensions)):
                    # Construct the full file path
                    file_path = os.path.join(root, file)

                    # Check if the file path matches any excluded path
                    exclude = False
                    for exclude_path in exclude_paths:
                        if exclude_path in file_path:
                            exclude = True
                            break

                    if not exclude:
                        # Write to the output file
                        output_file_handle.write("#" * 3 + f" {file_path} " + "#" * 3 + "\n")
                        content = read_file_safely(file_path)
                        output_file_handle.write(content + "\n")

    print(f"Output written to {output_file}")

def get_iso_datetime_with_tz(timezone):
    # Use the provided timezone
    tz = ZoneInfo(timezone)
    now = datetime.now(tz)
    return now.strftime("%Y-%m-%dT%H%M%S%z")

def get_system_timezone():
    # Get the system's local timezone as a string
    return str(get_localzone())

EXTENSIONS = ["ts", "js", "json", "mjs"]
EXCLUDE = ["lib", "Manifest.toml", "package-lock.json", "node_modules"]

def main():
    parser = argparse.ArgumentParser(
        description="Find files with specific extensions, exclude certain paths, and write to an output file."
    )
    parser.add_argument(
        "-e", "--extensions",
        nargs="+",
        default=EXTENSIONS,
        help="File extensions to include (default: %s)." % EXTENSIONS
    )
    parser.add_argument(
        "-x", "--exclude",
        nargs="+",
        default=EXCLUDE,
        help="Paths to exclude (default: %s)." % EXCLUDE
    )
    parser.add_argument(
        "-t", "--timezone",
        default=get_system_timezone(),
        help="Timezone for the timestamp (default: local system timezone)."
    )
    parser.add_argument(
        "-o", "--output",
        help="Output file name (default: code_<ISO_datetime>.txt)."
    )

    args = parser.parse_args()

    # Generate output file name if not provided
    timestamp = get_iso_datetime_with_tz(args.timezone)
    if not args.output:
        args.output = f"code_{timestamp}.txt"

    # Run the file finding function with arguments
    find_and_print_files(timestamp, args.extensions, args.exclude, args.output)

if __name__ == "__main__":
    main()