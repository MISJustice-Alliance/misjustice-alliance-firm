# Venice API Docs

## Docs

- [Introduction](https://docs.venice.ai/api-reference/api-spec.md): Reference documentation for the Venice API
- [Create API Key](https://docs.venice.ai/api-reference/endpoint/api_keys/create.md): Create a new API key.
- [Delete API Key](https://docs.venice.ai/api-reference/endpoint/api_keys/delete.md): Delete an API key.
- [Generate API Key with Web3 Wallet](https://docs.venice.ai/api-reference/endpoint/api_keys/generate_web3_key/get.md): Returns the token required to generate an API key via a wallet.
- [Generate API Key with Web3 Wallet](https://docs.venice.ai/api-reference/endpoint/api_keys/generate_web3_key/post.md): Authenticates a wallet holding sVVV and creates an API key.
- [Get API Key Details](https://docs.venice.ai/api-reference/endpoint/api_keys/get.md): Return details about a specific API key, including rate limits and balance data.
- [List API Keys](https://docs.venice.ai/api-reference/endpoint/api_keys/list.md): Return a list of API keys.
- [Rate Limit Logs](https://docs.venice.ai/api-reference/endpoint/api_keys/rate_limit_logs.md): Returns the last 50 rate limits that the account exceeded.
- [Rate Limits and Balances](https://docs.venice.ai/api-reference/endpoint/api_keys/rate_limits.md): Return details about user balances and rate limits.
- [Speech API (Beta)](https://docs.venice.ai/api-reference/endpoint/audio/speech.md): Converts text to speech using various voice models and formats.
- [Billing Usage API (Beta)](https://docs.venice.ai/api-reference/endpoint/billing/usage.md): Get paginated billing usage data for the authenticated user. NOTE: This is a beta endpoint and may be subject to change.
- [Get Character](https://docs.venice.ai/api-reference/endpoint/characters/get.md): This is a preview API and may change. Returns a single character by its slug.
- [List Characters](https://docs.venice.ai/api-reference/endpoint/characters/list.md): This is a preview API and may change. Returns a list of characters supported in the API.
- [Chat Completions](https://docs.venice.ai/api-reference/endpoint/chat/completions.md): Run text inference based on the supplied parameters. Supports multimodal inputs including text, images (image_url), audio (input_audio), and video (video_url) for compatible models. Long running requests should use the streaming API by setting stream=true in your request.
- [Model Feature Suffix](https://docs.venice.ai/api-reference/endpoint/chat/model_feature_suffix.md)
- [Generate Embeddings](https://docs.venice.ai/api-reference/endpoint/embeddings/generate.md): Create embeddings for the supplied input.
- [Edit (aka Inpaint)](https://docs.venice.ai/api-reference/endpoint/image/edit.md): Edit or modify an image based on the supplied prompt. The image can be provided either as a multipart form-data file upload or as a base64-encoded string in a JSON request.
- [Generate Images](https://docs.venice.ai/api-reference/endpoint/image/generate.md): Generate an image based on input parameters
- [Generate Images (OpenAI Compatible API)](https://docs.venice.ai/api-reference/endpoint/image/generations.md): Generate an image based on input parameters using an OpenAI compatible endpoint. This endpoint does not support the full feature set of the Venice Image Generation endpoint, but is compatible with the existing OpenAI endpoint.
- [Image Styles](https://docs.venice.ai/api-reference/endpoint/image/styles.md): List available image styles that can be used with the generate API.
- [Upscale and Enhance](https://docs.venice.ai/api-reference/endpoint/image/upscale.md): Upscale or enhance an image based on the supplied parameters. Using a scale of 1 with enhance enabled will only run the enhancer. The image can be provided either as a multipart form-data file upload or as a base64-encoded string in a JSON request.
- [Compatibility Mapping](https://docs.venice.ai/api-reference/endpoint/models/compatibility_mapping.md): Returns a list of model compatibility mappings and the associated model.
- [List Models](https://docs.venice.ai/api-reference/endpoint/models/list.md): Returns a list of available models supported by the Venice.ai API for both text and image inference.
- [Traits](https://docs.venice.ai/api-reference/endpoint/models/traits.md): Returns a list of model traits and the associated model.
- [Complete Video](https://docs.venice.ai/api-reference/endpoint/video/complete.md): Delete a video generation request from storage after it has been successfully downloaded. Videos can be automatically deleted after retrieval by setting the `delete_media_on_completion` flag to true when calling the retrieve API.
- [Queue Video Generation](https://docs.venice.ai/api-reference/endpoint/video/queue.md): Queue a new video generation request.
- [Quote Video Generation](https://docs.venice.ai/api-reference/endpoint/video/quote.md): Quote a video generation request. Utilizes the same parameters as the queue API and will return the price in USD for the request.
- [Retrieve Video](https://docs.venice.ai/api-reference/endpoint/video/retrieve.md): Retrieve a video generation result. Returns the video file if completed, or a status if the request is still processing.
- [Error Codes](https://docs.venice.ai/api-reference/error-codes.md): Predictable error codes for the Venice API
- [Rate Limits](https://docs.venice.ai/api-reference/rate-limiting.md): Request and token rate limits for the Venice API.
- [Audio Models](https://docs.venice.ai/models/audio.md): Text-to-speech models with multilingual voice support
- [Embedding Models](https://docs.venice.ai/models/embeddings.md): Text embeddings for semantic search and retrieval
- [Image Models](https://docs.venice.ai/models/image.md): Image generation, upscaling, and editing models
- [Models](https://docs.venice.ai/models/overview.md): Explore all available models on the Venice API
- [Text Models](https://docs.venice.ai/models/text.md): Chat, reasoning, and code generation models
- [Video Models](https://docs.venice.ai/models/video.md): Text-to-video and image-to-video generation
- [Venice API](https://docs.venice.ai/overview/about-venice.md)
- [Beta Models](https://docs.venice.ai/overview/beta-models.md): Beta models available for testing and evaluation on the Venice API
- [Deprecations](https://docs.venice.ai/overview/deprecations.md): Model inclusion and lifecycle policy and deprecations for the Venice API
- [Getting Started](https://docs.venice.ai/overview/getting-started.md)
- [AI Agents](https://docs.venice.ai/overview/guides/ai-agents.md): Venice is supported with the following AI Agent communities.
- [Generating an API Key](https://docs.venice.ai/overview/guides/generating-api-key.md)
- [Autonomous Agent API Key Creation](https://docs.venice.ai/overview/guides/generating-api-key-agent.md)
- [Integrations](https://docs.venice.ai/overview/guides/integrations.md): Here is a list of third party tools with Venice.ai integrations.
- [Using Postman](https://docs.venice.ai/overview/guides/postman.md)
- [Reasoning Models](https://docs.venice.ai/overview/guides/reasoning-models.md): Using reasoning models with visible thinking in the Venice API
- [Structured Responses](https://docs.venice.ai/overview/guides/structured-responses.md): Using structured responses within the Venice API
- [API Pricing](https://docs.venice.ai/overview/pricing.md)
- [Privacy](https://docs.venice.ai/overview/privacy.md)


## Optional

- [Changelog](https://featurebase.venice.ai/changelog)
- [Status Page](https://veniceai-status.com)
