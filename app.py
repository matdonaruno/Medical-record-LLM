import streamlit as st
import os
from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# LLMの設定
@st.cache_resource
def get_llm():
    llm = OllamaLLM(
        model="llama3",
        temperature=0.01
    )
    return llm

# タイトルの設定
st.title("Medical record LLM")

# セッション状態の初期化
if "messages" not in st.session_state:
    st.session_state.messages = []

# 過去のメッセージを表示
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# ユーザー入力
if prompt := st.chat_input("何か質問はありますか？"):
    # ユーザーメッセージをチャット履歴に追加
    st.session_state.messages.append({"role": "user", "content": prompt})
    
    # LLMを取得
    llm = get_llm()
    
    # プロンプトテンプレートの作成
    template = """あなたは医療現場のパソコン業務の相談チャットボットです。ユーザーの質問に丁寧に回答してください。
    
    質問: {question}
    
    回答:"""
    
    prompt_template = ChatPromptTemplate.from_template(template)
    
    # チェーンの作成
    chain = (
        {"question": RunnablePassthrough()} 
        | prompt_template 
        | llm 
        | StrOutputParser()
    )
    
    # AIの応答を生成
    with st.spinner("回答を生成中..."):
        response = chain.invoke(prompt)
    
    # AIの応答をチャット履歴に追加
    st.session_state.messages.append({"role": "assistant", "content": response}) 