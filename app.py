import os

import streamlit as st
import google.generativeai as genai
import pypdf
import torchaudio
import fal_client
from PIL import Image
import nltk
from nltk.corpus import wordnet
from yarngpt import generate_speech


def ensure_wordnet_available():
    try:
        nltk.data.find("corpora/wordnet")
    except LookupError:
        nltk.download("wordnet", quiet=True)


def configure_environment():
    GEMINI_KEY = "AIzaSyBFPms4fFcrVPlcYwz3zu9fo0nzGgLDpfQ"
    FAL_KEY = "863f7919-e673-4a8f-8860-098f9b7fbee1:793466980058c207f087c9e127c5267e"
    os.environ["GOOGLE_API_KEY"] = GEMINI_KEY
    os.environ["FAL_KEY"] = FAL_KEY
    return GEMINI_KEY, FAL_KEY


def render_theme():
    st.set_page_config(page_title="Senseii Smart Tutor", layout="centered")
    st.markdown(
        """
        <style>
            .stApp { background-color: #1A1A1E; color: #EAEAEA; }
            .stTextArea textarea, .stTextInput input {
                background-color: #25252B !important;
                color: #FFFFFF !important;
                border: 1px solid #8A2BE2 !important;
            }
            div.stButton > button:first-child {
                background-color: #8A2BE2 !important;
                color: white !important;
                border-radius: 8px;
                width: 100%;
                font-weight: bold;
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_sidebar():
    with st.sidebar:
        st.header("🎛️ Connectivity Control")
        app_mode = st.radio(
            "System Network Mode",
            ["🌐 Online (Cloud Enhanced)", "🔌 Offline (Local Device Only)"],
        )
        st.divider()

        st.header("📖 Built-in Dictionary")
        lookup_word = st.text_input(
            "Look up any confusing word:", placeholder="e.g., Pharmacokinetics"
        ).strip().lower()

        if lookup_word:
            synsets = wordnet.synsets(lookup_word)
            if synsets:
                definition = synsets[0].definition()
                pos = synsets[0].lexname().split(".")[0]
                st.success(f"**{lookup_word}** ({pos}):\n\n_{definition}_")
                examples = synsets[0].examples()
                if examples:
                    st.info(f"Example: \"{examples[0]}\"")
            else:
                st.warning("Word matching layout not found in offline data.")

        st.divider()
        st.header("Study Settings")
        subject_context = st.selectbox(
            "What are we studying?",
            ["Pharmacy", "Computer Science", "Medicine", "Law", "General"],
        )

    return app_mode, subject_context


def render_voice_controls(app_mode):
    cloned_audio_file = None
    if app_mode == "🔌 Offline (Local Device Only)":
        st.info("Local CPU Active. Custom Voice Cloning is unavailable offline.")
        voice_type = "YarnGPT Presets"
        voice_choice = st.selectbox("Choose Local Voice", ["idera", "chinenye", "jude", "tayo"])
    else:
        voice_type = st.radio(
            "Voice Engine Mode", ["YarnGPT Presets", "Clone My Own Voice"]
        )
        voice_choice = None
        if voice_type == "YarnGPT Presets":
            voice_choice = st.selectbox("Choose Local Voice", ["idera", "chinenye", "jude", "tayo"])
        else:
            cloned_audio_file = st.file_uploader(
                "Upload 10s voice sample (.wav or .mp3)", type=["wav", "mp3"]
            )
    return voice_type, voice_choice, cloned_audio_file


def extract_text_from_inputs():
    tab1, tab2, tab3 = st.tabs(
        ["✍️ Paste Text", "📄 Upload PDF Document", "📸 Upload Picture Notes"]
    )
    extracted_text = ""
    extracted_images = None

    with tab1:
        text_notes = st.text_area("Paste text chapters here:", height=200)
        if text_notes:
            extracted_text = text_notes

    with tab2:
        pdf_file = st.file_uploader("Drop your textbook PDF files here", type=["pdf"])
        if pdf_file:
            with st.spinner("Extracting text layers locally..."):
                reader = pypdf.PdfReader(pdf_file)
                for page in reader.pages:
                    text_content = page.extract_text()
                    if text_content:
                        extracted_text += text_content + "\n"
            st.success("PDF processing complete!")

    with tab3:
        image_files = st.file_uploader(
            "Upload photos of notes",
            type=["jpg", "png", "jpeg"],
            accept_multiple_files=True,
        )
        if image_files:
            extracted_images = image_files

    return extracted_text, extracted_images


def run_audio_pipeline(
    voice_type,
    voice_choice,
    cloned_audio_file,
    text_to_speak,
):
    with st.spinner("Compiling audio engine output..."):
        try:
            if voice_type == "YarnGPT Presets":
                audio_data = generate_speech(
                    text_to_speak, speaker=voice_choice, language="english"
                )
                torchaudio.save("notes_playback.wav", audio_data, sample_rate=24000)
                st.audio("notes_playback.wav")
            else:
                if cloned_audio_file is None:
                    st.warning("Please upload a voice sample to use Clone My Own Voice.")
                    return
                voice_url = fal_client.upload_file(cloned_audio_file)
                result = fal_client.subscribe(
                    "fal-ai/f5-tts",
                    arguments={
                        "gen_text": text_to_speak,
                        "ref_audio_url": voice_url,
                        "model_type": "F5-TTS",
                    },
                )
                st.audio(result["audio_url"]["url"])
            st.success("Audio loaded locally! Background playback enabled.")
        except Exception as exc:
            st.error(f"Voice pipeline error: {exc}")


def run_quiz_pipeline(app_mode, extracted_text, subject_context, GEMINI_KEY):
    if app_mode == "🌐 Online (Cloud Enhanced)":
        with st.spinner("Cloud AI drafting evaluation quiz..."):
            genai.configure(api_key=GEMINI_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            quiz_prompt = (
                f"Act as an expert professor in {subject_context}. "
                f"Read these notes: {extracted_text}. "
                "Generate a quiz with exactly 1 Easy, 1 Medium, and 1 Difficult question."
            )
            quiz_response = model.generate_content(quiz_prompt)
            st.markdown("### 📝 Active Evaluation Quiz")
            st.write(quiz_response.text)
    else:
        st.markdown("### 📝 Active Evaluation Quiz (Offline Mode)")
        st.write(
            f"**[Offline Mode Active]** Review your pasted text carefully. "
            f"Test yourself on the core definition of terms, its practical application "
            f"inside {subject_context}, and how this system integrates with external constraints."
        )


def run_chat_tutorial(app_mode, extracted_text, subject_context, GEMINI_KEY, user_query):
    if not user_query or not extracted_text:
        return

    if app_mode == "🔌 Offline (Local Device Only)":
        st.warning("Chat explanation mechanics require a live internet cloud configuration.")
        return

    with st.spinner("Analyzing curriculum baseline..."):
        genai.configure(api_key=GEMINI_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        chat_prompt = (
            f"Using this text as base reference material: {extracted_text}. "
            f"In the professional domain of {subject_context}, explain this clearly to a student: {user_query}"
        )
        chat_response = model.generate_content(chat_prompt)
        st.write(chat_response.text)


def main():
    ensure_wordnet_available()
    GEMINI_KEY, _ = configure_environment()
    render_theme()

    app_mode, subject_context = render_sidebar()
    voice_type, voice_choice, cloned_audio_file = render_voice_controls(app_mode)

    st.header("Tutor Persona")
    personality = st.selectbox(
        "Tutor Mood",
        ["Normal Tone", "Strict Nigerian Lecturer Mode", "Big Brother/Sister Encouragement"],
    )

    st.title("🇳🇬 Senseii Hybrid Tutor")
    st.subheader(f"Current Status: {app_mode}")

    extracted_text, image_files = extract_text_from_inputs()

    if image_files and app_mode != "🔌 Offline (Local Device Only)":
        with st.spinner("Scanning image layers via cloud AI..."):
            genai.configure(api_key=GEMINI_KEY)
            ocr_model = genai.GenerativeModel("gemini-1.5-flash")
            for img_file in image_files:
                img = Image.open(img_file)
                ocr_prompt = "Extract and read all the handwritten or printed notes from this image verbatim."
                img_response = ocr_model.generate_content([ocr_prompt, img])
                extracted_text += img_response.text + "\n"
            st.success("Images transcribed successfully!")
    elif image_files:
        st.error(
            "Image OCR analysis requires an online multi-modal connection. "
            "Switch to Online mode to process images."
        )

    if st.button("🚀 Start Learning Session"):
        if not extracted_text.strip():
            st.warning("Please provide study text first!")
        else:
            personality_rules = {
                "Strict Nigerian Lecturer Mode": (
                    "Look, look at your notes and listen to me closely. Don't make mistakes. "
                ),
                "Big Brother/Sister Encouragement": (
                    "Abeg make you rest your mind and grab this point, you've got this. "
                ),
                "Normal Tone": "",
            }
            text_to_speak = personality_rules.get(personality, "") + extracted_text[:400]
            run_audio_pipeline(
                voice_type,
                voice_choice,
                cloned_audio_file,
                text_to_speak,
            )
            run_quiz_pipeline(app_mode, extracted_text, subject_context, GEMINI_KEY)

    st.divider()
    st.subheader("💬 Ask Senseii")
    user_query = st.text_input("Type your question here:")
    run_chat_tutorial(app_mode, extracted_text, subject_context, GEMINI_KEY, user_query)


if __name__ == "__main__":
    main()
