import boto3

def load_md_from_s3(bucket_name: str, key: str) -> str:
    """S3からMarkdownファイルを読み込む"""
    try:
        s3 = boto3.client("s3")
        obj = s3.get_object(Bucket=bucket_name, Key=key)
        return obj["Body"].read().decode("utf-8")
    except Exception as e:
        raise Exception(f"S3からファイルを読み込めませんでした: {str(e)}")
