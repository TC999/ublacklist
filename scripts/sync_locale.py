#!/usr/bin/env python3
import os
import re

# 源语言文件路径
SOURCE_FILE = 'src/_locales/en/messages.json.ts'
# 语言目录
LOCALES_DIR = 'src/_locales'
# 排除的目录
EXCLUDE_DIRS = ['en', '.git', '.github', '.vscode', 'node_modules', 'helpers.ts']


def extract_messages(file_path):
    """从文件中提取消息词条"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 使用正则表达式匹配messages对象
    match = re.search(r'exportAsMessages\((\{[\s\S]*?\})\)', content, re.DOTALL)
    if not match:
        raise ValueError(f"在文件 {file_path} 中未找到messages对象")

    # 提取messages对象字符串
    messages_str = match.group(1)

    # 提取所有键值对
    messages = {}
    # 匹配键值对，考虑多行字符串
    pattern = r'(\w+)\s*:\s*(?:\'([^\']*)\'|"([^"]*)")' 
    matches = re.finditer(pattern, messages_str, re.DOTALL)

    for match in matches:
        key = match.group(1)
        value = match.group(2) or match.group(3)
        # 处理转义字符
        value = value.replace('\n', '').replace('\t', '').strip()
        messages[key] = value

    return messages


def update_locale_file(file_path, source_messages):
    """更新语言文件，添加缺失的词条"""
    # 读取现有文件内容
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 提取现有messages
    match = re.search(r'exportAsMessages\((\{[\s\S]*?\})\)', content, re.DOTALL)
    if not match:
        raise ValueError(f"在文件 {file_path} 中未找到messages对象")

    # 提取现有messages对象字符串和位置
    existing_messages_str = match.group(1)
    start_pos = match.start(1)
    end_pos = match.end(1)

    # 解析现有messages
    existing_messages = {}
    pattern = r'(\w+)\s*:\s*(?:\'([^\']*)\'|"([^"]*)")' 
    matches = re.finditer(pattern, existing_messages_str, re.DOTALL)

    for match in matches:
        key = match.group(1)
        value = match.group(2) or match.group(3)
        value = value.replace('\n', '').replace('\t', '').strip()
        existing_messages[key] = value

    # 添加缺失的词条
    updated = False
    for key, value in source_messages.items():
        if key not in existing_messages:
            existing_messages[key] = value
            updated = True
            print(f"添加缺失的词条 '{key}' 到 {file_path}")

    if not updated:
        print(f"文件 {file_path} 已经包含所有词条，无需更新")
        return False

    # 生成更新后的messages字符串
    updated_messages_str = '{'
    # 按照字母顺序排序
    for key in sorted(existing_messages.keys()):
        value = existing_messages[key]
        # 确保值中的单引号被正确处理
        value = value.replace("'", "\\'")
        updated_messages_str += f"\n  {key}: '{value}',"
    # 移除最后一个逗号
    if updated_messages_str.endswith(','):
        updated_messages_str = updated_messages_str[:-1]
    updated_messages_str += '\n}'

    # 构建更新后的文件内容
    updated_content = content[:start_pos] + updated_messages_str + content[end_pos:]

    # 写回文件
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(updated_content)

    print(f"已更新文件: {file_path}")
    return True


def main():
    try:
        # 提取源语言文件的messages
        source_messages = extract_messages(SOURCE_FILE)
        print(f"从 {SOURCE_FILE} 提取了 {len(source_messages)} 个词条")

        # 遍历所有语言目录
        for locale in os.listdir(LOCALES_DIR):
            locale_dir = os.path.join(LOCALES_DIR, locale)

            # 跳过排除的目录和文件
            if locale in EXCLUDE_DIRS or not os.path.isdir(locale_dir):
                continue

            # 检查messages.json.ts文件是否存在
            target_file = os.path.join(locale_dir, 'messages.json.ts')
            if not os.path.exists(target_file):
                print(f"警告: 文件 {target_file} 不存在，跳过")
                continue

            # 更新语言文件
            update_locale_file(target_file, source_messages)

        print("所有语言文件同步完成!")

    except Exception as e:
        print(f"出错: {e}")
        exit(1)


if __name__ == '__main__':
    main()