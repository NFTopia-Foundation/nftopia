import os
import subprocess

# Directory containing your Cairo contracts
contract_dir = 'src'
# Output directory for compiled contracts
output_dir = '/path/to/output'

# Ensure output directory exists
os.makedirs(output_dir, exist_ok=True)

# Loop through each .cairo file in the contract directory
for contract_file in os.listdir(contract_dir):
    if contract_file.endswith('.cairo'):
        # Full path to the .cairo file
        contract_path = os.path.join(contract_dir, contract_file)
        
        # Run the starknet compile command
        compile_command = [
            'starknet', 'compile', '--contract', contract_path,
            '--output', output_dir
        ]
        
        print(f"Compiling {contract_file}...")
        
        try:
            # Execute the command
            subprocess.run(compile_command, check=True)
            print(f"Successfully compiled {contract_file}")
        except subprocess.CalledProcessError as e:
            print(f"Error compiling {contract_file}: {e}")
