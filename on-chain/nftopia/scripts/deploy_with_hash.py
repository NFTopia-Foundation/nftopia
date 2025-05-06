import subprocess
import getpass
import json
from pathlib import Path

# === CONFIG ===
ACCOUNT_PATH = Path.home() / ".starkli-accounts/my-oz-account.json"
KEYSTORE_PATH = Path.home() / ".starkli-wallets/my-keystore.json"
NETWORK = "sepolia"
FEE_TOKEN = "strk"
CONTRACT_CLASS_PATH = Path("/home/seyi/Documents/deployment_example/target/dev/deployment_example_HelloStarknet.contract_class.json")
EXPECTED_CLASS_HASH = "0x020b7bca19d3c12d1e846a2a2e625df14b570056325905eaf06e76dd4e362e84"  # Replace if different
SHOULD_DEPLOY = True

# === Get keystore password ===
keystore_password = getpass.getpass("Enter keystore password: ")

# === Step 1: Compute class hash ===
def get_class_hash():
    try:
        result = subprocess.run(
            ["starkli", "class-hash", str(CONTRACT_CLASS_PATH)],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print("Error computing class hash:", e.stderr)
        return None

# === Step 2: Declare contract ===
def declare_contract():
    print("Declaring contract...")
    try:
        subprocess.run(
            [
                "starkli", "declare",
                "--account", str(ACCOUNT_PATH),
                "--keystore", str(KEYSTORE_PATH),
                "--network", NETWORK,
                "--fee-token", FEE_TOKEN,
                str(CONTRACT_CLASS_PATH)
            ],
            input=keystore_password + "\n",
            text=True,
            check=True
        )
        print("Contract declared successfully.")
    except subprocess.CalledProcessError as e:
        print("Error declaring contract:", e.stderr)

# === Step 3: Deploy contract ===
def deploy_contract():
    print(f"Deploying contract with class hash {EXPECTED_CLASS_HASH}...")
    try:
        subprocess.run(
            [
                "starkli", "deploy",
                "--account", str(ACCOUNT_PATH),
                "--keystore", str(KEYSTORE_PATH),
                "--network", NETWORK,
                "--fee-token", FEE_TOKEN,
                EXPECTED_CLASS_HASH
            ],
            input=keystore_password + "\n",
            text=True,
            check=True
        )
        print("Contract deployed.")
    except subprocess.CalledProcessError as e:
        print("Deployment failed:", e.stderr)

# === Main Logic ===
if __name__ == "__main__":
    computed_hash = get_class_hash()
    if not computed_hash:
        exit(1)

    print("Computed class hash:", computed_hash)
    if computed_hash.lower() == EXPECTED_CLASS_HASH.lower():
        print("✅ Class hash matches expected.")
    else:
        print("❌ Class hash mismatch. Redeclaring contract...")
        declare_contract()

    if SHOULD_DEPLOY:
        deploy_contract()



# import subprocess
# import getpass
# import os

# # === CONFIG (from environment variables) ===
# ACCOUNT_PATH = os.getenv("STARKLI_ACCOUNT_PATH")
# KEYSTORE_PATH = os.getenv("STARKLI_KEYSTORE_PATH")
# NETWORK = os.getenv("STARKLI_NETWORK", "sepolia")  # Default to sepolia if not set
# FEE_TOKEN = os.getenv("STARKLI_FEE_TOKEN", "strk")  # Default to strk if not set
# CONTRACT_CLASS_PATH = os.getenv("STARKLI_CONTRACT_CLASS_PATH")
# EXPECTED_CLASS_HASH = os.getenv("STARKLI_EXPECTED_CLASS_HASH")
# SHOULD_DEPLOY = True

# # === Get keystore password ===
# keystore_password = getpass.getpass("Enter keystore password: ")

# # === Step 1: Compute class hash ===
# def get_class_hash():
#     try:
#         result = subprocess.run(
#             ["starkli", "class-hash", CONTRACT_CLASS_PATH],
#             capture_output=True,
#             text=True,
#             check=True
#         )
#         return result.stdout.strip()
#     except subprocess.CalledProcessError as e:
#         print("Error computing class hash:", e.stderr)
#         return None

# # === Step 2: Declare contract ===
# def declare_contract():
#     print("Declaring contract...")
#     try:
#         subprocess.run(
#             [
#                 "starkli", "declare",
#                 "--account", ACCOUNT_PATH,
#                 "--keystore", KEYSTORE_PATH,
#                 "--network", NETWORK,
#                 "--fee-token", FEE_TOKEN,
#                 CONTRACT_CLASS_PATH
#             ],
#             input=keystore_password + "\n",
#             text=True,
#             check=True
#         )
#         print("Contract declared successfully.")
#     except subprocess.CalledProcessError as e:
#         print("Error declaring contract:", e.stderr)

# # === Step 3: Deploy contract ===
# def deploy_contract():
#     print(f"Deploying contract with class hash {EXPECTED_CLASS_HASH}...")
#     try:
#         subprocess.run(
#             [
#                 "starkli", "deploy",
#                 "--account", ACCOUNT_PATH,
#                 "--keystore", KEYSTORE_PATH,
#                 "--network", NETWORK,
#                 "--fee-token", FEE_TOKEN,
#                 EXPECTED_CLASS_HASH
#             ],
#             input=keystore_password + "\n",
#             text=True,
#             check=True
#         )
#         print("Contract deployed.")
#     except subprocess.CalledProcessError as e:
#         print("Deployment failed:", e.stderr)

# # === Main Logic ===
# if __name__ == "__main__":
#     computed_hash = get_class_hash()
#     if not computed_hash:
#         exit(1)

#     print("Computed class hash:", computed_hash)
#     if computed_hash.lower() == EXPECTED_CLASS_HASH.lower():
#         print("✅ Class hash matches expected.")
#     else:
#         print("❌ Class hash mismatch. Redeclaring contract...")
#         declare_contract()

#     if SHOULD_DEPLOY:
#         deploy_contract()
