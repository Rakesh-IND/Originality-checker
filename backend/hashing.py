import io
from PIL import Image
import imagehash

def compute_dhash(image_bytes: bytes) -> str:
    """
    Computes a 64-bit dHash of the image.
    Uses imagehash.dhash with hash_size=8, returning a hex string.
    """
    image = Image.open(io.BytesIO(image_bytes))
    # Convert to RGB to ensure consistent handling of RGBA, etc.
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    hash_obj = imagehash.dhash(image, hash_size=8)
    return str(hash_obj)

def compute_similarity(hash1_hex: str, hash2_hex: str) -> float:
    """
    Computes the similarity percentage (0-100) between two hex string dHashes.
    Based on the Hamming distance of 64-bit hashes.
    """
    hash1 = imagehash.hex_to_hash(hash1_hex)
    hash2 = imagehash.hex_to_hash(hash2_hex)
    
    # difference returns the hamming distance
    hamming_distance = hash1 - hash2
    
    similarity = ((64 - hamming_distance) / 64) * 100
    return round(similarity, 2)
