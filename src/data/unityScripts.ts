export interface UnityScriptItem {
  id: string;
  filename: string;
  module: string;
  summary: string;
  code: string;
}

export const UNITY_SCRIPTS: UnityScriptItem[] = [
  {
    id: 'movement-data',
    filename: 'MovementData.cs',
    module: 'Core Module 1 · Physics Config',
    summary: 'ScriptableObject tuning asset separating acceleration, deceleration, jump-cut, coyote time, jump buffer, wall-jump, dash, and pogo parameters.',
    code: `using UnityEngine;

namespace Mossgrotto.Player
{
    [CreateAssetMenu(fileName = "MovementData", menuName = "Mossgrotto/Movement Data")]
    public class MovementData : ScriptableObject
    {
        [Header("Horizontal Run")]
        public float maxRunSpeed = 9.5f;
        public float groundAcceleration = 95f;
        public float groundDeceleration = 120f;
        [Range(0.1f, 1f)] public float airControlFactor = 0.72f;

        [Header("Jump & Gravity")]
        public float jumpForce = 16.5f;
        [Range(0.1f, 0.9f)] public float jumpCutMultiplier = 0.44f;
        public float baseGravityScale = 3.2f;
        public float fallGravityMultiplier = 1.5f;
        public float maxFallSpeed = 21f;

        [Header("Tolerance Windows (Game Juice)")]
        [Tooltip("Grace window to jump after walking off a ledge.")]
        public float coyoteTime = 0.12f;
        [Tooltip("Pre-landing input buffer window.")]
        public float jumpBufferTime = 0.10f;

        [Header("Wall Slide & Wall Jump")]
        public float wallSlideSpeed = 3.6f;
        public Vector2 wallJumpVelocity = new Vector2(11.5f, 15.8f);
        public float wallJumpLockTime = 0.14f;

        [Header("Silk Dash")]
        public float dashSpeed = 23f;
        public float dashDuration = 0.155f;
        public float dashCooldown = 0.42f;
        public float dashIFrameDuration = 0.20f;

        [Header("Downward Slash Pogo")]
        public float pogoBounceVelocity = 15.6f;
    }
}`,
  },
  {
    id: 'input-handler',
    filename: 'PlayerInputHandler.cs',
    module: 'Core Module 1 · Input Separation',
    summary: 'Isolates Unity Input System / legacy input polling from physics, distinguishing continuous held axes from edge-triggered jump, dash, and slash buffers.',
    code: `using UnityEngine;

namespace Mossgrotto.Player
{
    public class PlayerInputHandler : MonoBehaviour
    {
        public Vector2 MoveInput { get; private set; }
        public bool JumpHeld { get; private set; }
        public bool JumpPressed { get; private set; }
        public bool JumpReleased { get; private set; }
        public bool AttackPressed { get; private set; }
        public bool DashPressed { get; private set; }
        public bool HealPressed { get; private set; }

        private void Update()
        {
            float x = Input.GetAxisRaw("Horizontal");
            float y = Input.GetAxisRaw("Vertical");
            MoveInput = new Vector2(x, y);

            JumpHeld = Input.GetButton("Jump") || Input.GetKey(KeyCode.Z);
            JumpPressed = Input.GetButtonDown("Jump") || Input.GetKeyDown(KeyCode.Z);
            JumpReleased = Input.GetButtonUp("Jump") || Input.GetKeyUp(KeyCode.Z);

            AttackPressed = Input.GetKeyDown(KeyCode.J) || Input.GetKeyDown(KeyCode.X) || Input.GetMouseButtonDown(0);
            DashPressed = Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.K) || Input.GetKeyDown(KeyCode.C);
            HealPressed = Input.GetKeyDown(KeyCode.F) || Input.GetKeyDown(KeyCode.H);
        }
    }
}`,
  },
  {
    id: 'player-motor',
    filename: 'PlayerMotor2D.cs',
    module: 'Core Module 1 · Physics Controller',
    summary: 'Snappy Rigidbody2D controller implementing coyote time, jump buffering, variable jump cut, wall slide/jump, and Silk Dash with i-frames.',
    code: `using System.Collections;
using UnityEngine;

namespace Mossgrotto.Player
{
    [RequireComponent(typeof(Rigidbody2D), typeof(BoxCollider2D), typeof(PlayerInputHandler))]
    public class PlayerMotor2D : MonoBehaviour
    {
        [SerializeField] private MovementData data;
        [SerializeField] private LayerMask groundLayer;
        [SerializeField] private Transform groundCheck;
        [SerializeField] private Transform wallCheckRight;
        [SerializeField] private Transform wallCheckLeft;
        [SerializeField] private Vector2 groundCheckSize = new Vector2(0.55f, 0.08f);

        private Rigidbody2D _rb;
        private PlayerInputHandler _input;

        public int FacingDirection { get; private set; } = 1;
        public bool IsGrounded { get; private set; }
        public bool IsDashing { get; private set; }
        public bool IsInvulnerable { get; private set; }

        private float _coyoteTimer;
        private float _jumpBufferTimer;
        private float _wallJumpLockTimer;
        private float _dashCooldownTimer;
        private bool _airDashAvailable = true;
        private int _wallDir;

        private void Awake()
        {
            _rb = GetComponent<Rigidbody2D>();
            _input = GetComponent<PlayerInputHandler>();
            _rb.freezeRotation = true;
            _rb.collisionDetectionMode = CollisionDetectionMode2D.Continuous;
        }

        private void Update()
        {
            CheckSurfaces();
            UpdateTimers();

            if (_input.JumpPressed)
                _jumpBufferTimer = data.jumpBufferTime;

            if (_input.JumpReleased && _rb.linearVelocity.y > 0f && !IsDashing)
                _rb.linearVelocity = new Vector2(_rb.linearVelocity.x, _rb.linearVelocity.y * data.jumpCutMultiplier);

            if (_input.DashPressed && !IsDashing && _dashCooldownTimer <= 0f && (IsGrounded || _airDashAvailable))
                StartCoroutine(PerformDash());
        }

        private void FixedUpdate()
        {
            if (IsDashing) return;

            ApplyHorizontalMovement();
            ApplyGravityAndWallSlide();
            TryExecuteJump();
        }

        private void CheckSurfaces()
        {
            IsGrounded = Physics2D.OverlapBox(groundCheck.position, groundCheckSize, 0f, groundLayer);
            if (IsGrounded)
            {
                _coyoteTimer = data.coyoteTime;
                _airDashAvailable = true;
            }

            bool onRightWall = Physics2D.OverlapCircle(wallCheckRight.position, 0.08f, groundLayer);
            bool onLeftWall = Physics2D.OverlapCircle(wallCheckLeft.position, 0.08f, groundLayer);
            _wallDir = onRightWall ? 1 : (onLeftWall ? -1 : 0);
        }

        private void UpdateTimers()
        {
            if (!IsGrounded && _coyoteTimer > 0f) _coyoteTimer -= Time.deltaTime;
            if (_jumpBufferTimer > 0f) _jumpBufferTimer -= Time.deltaTime;
            if (_wallJumpLockTimer > 0f) _wallJumpLockTimer -= Time.deltaTime;
            if (_dashCooldownTimer > 0f) _dashCooldownTimer -= Time.deltaTime;
        }

        private void ApplyHorizontalMovement()
        {
            if (_wallJumpLockTimer > 0f) return;

            float moveX = _input.MoveInput.x;
            if (Mathf.Abs(moveX) > 0.01f)
                FacingDirection = moveX > 0 ? 1 : -1;

            float targetSpeed = moveX * data.maxRunSpeed;
            float accelRate = Mathf.Abs(targetSpeed) > 0.01f
                ? data.groundAcceleration
                : data.groundDeceleration;

            if (!IsGrounded)
                accelRate *= data.airControlFactor;

            float newX = Mathf.MoveTowards(_rb.linearVelocity.x, targetSpeed, accelRate * Time.fixedDeltaTime);
            _rb.linearVelocity = new Vector2(newX, _rb.linearVelocity.y);
        }

        private void ApplyGravityAndWallSlide()
        {
            bool isWallSliding = !IsGrounded && _wallDir != 0 && Mathf.Approximately(_input.MoveInput.x, _wallDir) && _rb.linearVelocity.y < 0f;
            if (isWallSliding)
            {
                _rb.gravityScale = data.baseGravityScale * 0.5f;
                float clampedY = Mathf.Max(_rb.linearVelocity.y, -data.wallSlideSpeed);
                _rb.linearVelocity = new Vector2(_rb.linearVelocity.x, clampedY);
                return;
            }

            _rb.gravityScale = _rb.linearVelocity.y < 0f
                ? data.baseGravityScale * data.fallGravityMultiplier
                : data.baseGravityScale;

            if (_rb.linearVelocity.y < -data.maxFallSpeed)
                _rb.linearVelocity = new Vector2(_rb.linearVelocity.x, -data.maxFallSpeed);
        }

        private void TryExecuteJump()
        {
            if (_jumpBufferTimer <= 0f) return;

            if (_coyoteTimer > 0f)
            {
                _rb.linearVelocity = new Vector2(_rb.linearVelocity.x, data.jumpForce);
                _coyoteTimer = 0f;
                _jumpBufferTimer = 0f;
            }
            else if (_wallDir != 0 && !IsGrounded)
            {
                _rb.linearVelocity = new Vector2(-_wallDir * data.wallJumpVelocity.x, data.wallJumpVelocity.y);
                FacingDirection = -_wallDir;
                _wallJumpLockTimer = data.wallJumpLockTime;
                _jumpBufferTimer = 0f;
                _airDashAvailable = true;
            }
        }

        public void ExecutePogoBounce()
        {
            _rb.linearVelocity = new Vector2(_rb.linearVelocity.x, data.pogoBounceVelocity);
            _airDashAvailable = true;
        }

        private IEnumerator PerformDash()
        {
            IsDashing = true;
            IsInvulnerable = true;
            _dashCooldownTimer = data.dashCooldown;
            if (!IsGrounded) _airDashAvailable = false;

            float originalGravity = _rb.gravityScale;
            _rb.gravityScale = 0f;
            _rb.linearVelocity = new Vector2(FacingDirection * data.dashSpeed, 0f);

            yield return new WaitForSeconds(data.dashDuration);

            _rb.gravityScale = originalGravity;
            IsDashing = false;

            float remainingIFrames = Mathf.Max(0f, data.dashIFrameDuration - data.dashDuration);
            if (remainingIFrames > 0f) yield return new WaitForSeconds(remainingIFrames);
            IsInvulnerable = false;
        }
    }
}`,
  },
  {
    id: 'player-combat',
    filename: 'PlayerCombat.cs',
    module: 'Core Module 3 · Slash, Pogo & Soul Healing',
    summary: 'Handles directional nail slashes, downward pogo bounce overlap detection, Soul generation, and Focus healing.',
    code: `using UnityEngine;

namespace Mossgrotto.Player
{
    public class PlayerCombat : MonoBehaviour
    {
        [SerializeField] private MovementData movementData;
        [SerializeField] private LayerMask pogoTargetLayers;
        [SerializeField] private float attackCooldown = 0.24f;
        [SerializeField] private Vector2 slashBoxSize = new Vector2(1.45f, 1.35f);
        [SerializeField] private float slashOffset = 0.95f;

        [Header("Soul & Health")]
        [SerializeField] private int maxHealth = 5;
        [SerializeField] private int healSoulCost = 33;

        private PlayerMotor2D _motor;
        private PlayerInputHandler _input;
        private float _attackTimer;

        public int CurrentHealth { get; private set; }
        public int CurrentSoul { get; private set; }

        private void Awake()
        {
            _motor = GetComponent<PlayerMotor2D>();
            _input = GetComponent<PlayerInputHandler>();
            CurrentHealth = maxHealth;
        }

        private void Update()
        {
            if (_attackTimer > 0f) _attackTimer -= Time.deltaTime;

            if (_input.AttackPressed && _attackTimer <= 0f)
                PerformDirectionalSlash();

            if (_input.HealPressed && _motor.IsGrounded && CurrentSoul >= healSoulCost && CurrentHealth < maxHealth)
            {
                CurrentSoul -= healSoulCost;
                CurrentHealth = Mathf.Min(maxHealth, CurrentHealth + 1);
            }
        }

        private void PerformDirectionalSlash()
        {
            _attackTimer = attackCooldown;

            Vector2 dir = new Vector2(_motor.FacingDirection, 0f);
            bool isDownSlash = _input.MoveInput.y < -0.5f && !_motor.IsGrounded;

            if (_input.MoveInput.y > 0.5f) dir = Vector2.up;
            else if (isDownSlash) dir = Vector2.down;

            Vector2 center = (Vector2)transform.position + dir * slashOffset;
            Collider2D[] hits = Physics2D.OverlapBoxAll(center, slashBoxSize, 0f, pogoTargetLayers);

            bool bounced = false;
            foreach (Collider2D hit in hits)
            {
                if (hit.TryGetComponent<IDamageable>(out var target))
                {
                    target.TakeDamage(1, dir);
                    CurrentSoul = Mathf.Min(100, CurrentSoul + 14);
                    HitStopManager.Instance?.TriggerHitStop(0.045f);
                }

                if (isDownSlash && !bounced)
                {
                    _motor.ExecutePogoBounce();
                    bounced = true;
                }
            }
        }
    }

    public interface IDamageable
    {
        void TakeDamage(int amount, Vector2 hitDirection);
    }
}`,
  },
  {
    id: 'parallax-layer',
    filename: 'ParallaxLayer.cs',
    module: 'Core Module 2 · Moss Grotto Depth',
    summary: 'Multi-tier parallax transform driver for Layer 0-4 backgrounds, distant moss silhouettes, and foreground foliage curtains.',
    code: `using UnityEngine;

namespace Mossgrotto.Environment
{
    public class ParallaxLayer : MonoBehaviour
    {
        [Tooltip("0 = static sky, 0.2 = distant silhouettes, 1.0 = gameplay, >1.2 = foreground")]
        [SerializeField] private Vector2 parallaxMultiplier = new Vector2(0.35f, 0.2f);
        [SerializeField] private Transform cameraTransform;

        private Vector3 _lastCameraPos;

        private void Start()
        {
            if (cameraTransform == null && Camera.main != null)
                cameraTransform = Camera.main.transform;

            if (cameraTransform != null)
                _lastCameraPos = cameraTransform.position;
        }

        private void LateUpdate()
        {
            if (cameraTransform == null) return;

            Vector3 delta = cameraTransform.position - _lastCameraPos;
            transform.position += new Vector3(
                delta.x * parallaxMultiplier.x,
                delta.y * parallaxMultiplier.y,
                0f
            );
            _lastCameraPos = cameraTransform.position;
        }
    }
}`,
  },
  {
    id: 'crawler-enemy',
    filename: 'CrawlerEnemy.cs',
    module: 'Core Module 3 · Patrol AI',
    summary: 'Platform crawler using front wall and ground-edge raycasts to patrol ledges seamlessly without falling off.',
    code: `using UnityEngine;

namespace Mossgrotto.AI
{
    [RequireComponent(typeof(Rigidbody2D))]
    public class CrawlerEnemy : MonoBehaviour, Mossgrotto.Player.IDamageable
    {
        [SerializeField] private float patrolSpeed = 2.4f;
        [SerializeField] private int maxHp = 3;
        [SerializeField] private Transform ledgeCheck;
        [SerializeField] private float rayDistance = 0.45f;
        [SerializeField] private LayerMask groundLayer;

        private Rigidbody2D _rb;
        private int _facing = 1;
        private int _hp;

        private void Awake()
        {
            _rb = GetComponent<Rigidbody2D>();
            _hp = maxHp;
        }

        private void FixedUpdate()
        {
            _rb.linearVelocity = new Vector2(_facing * patrolSpeed, _rb.linearVelocity.y);

            bool groundAhead = Physics2D.Raycast(ledgeCheck.position, Vector2.down, rayDistance, groundLayer);
            bool wallAhead = Physics2D.Raycast(ledgeCheck.position, Vector2.right * _facing, 0.25f, groundLayer);

            if (!groundAhead || wallAhead)
                Flip();
        }

        private void Flip()
        {
            _facing *= -1;
            Vector3 scale = transform.localScale;
            scale.x = Mathf.Abs(scale.x) * _facing;
            transform.localScale = scale;
        }

        public void TakeDamage(int amount, Vector2 hitDirection)
        {
            _hp -= amount;
            _rb.linearVelocity = new Vector2(hitDirection.x * 4.5f, _rb.linearVelocity.y);
            if (_hp <= 0) Destroy(gameObject);
        }
    }
}`,
  },
  {
    id: 'flying-enemy',
    filename: 'FlyingEnemyAI.cs',
    module: 'Core Module 3 · Multi-State Flying AI',
    summary: 'Three-state airborne AI (Follow -> Windup/Attack Dive -> Recover) hovering above the player before executing fast diagonal strikes.',
    code: `using UnityEngine;

namespace Mossgrotto.AI
{
    public class FlyingEnemyAI : MonoBehaviour, Mossgrotto.Player.IDamageable
    {
        public enum State { Follow, Windup, Attack, Recover }

        [SerializeField] private Transform player;
        [SerializeField] private float hoverHeight = 3.2f;
        [SerializeField] private float followSpeed = 5.0f;
        [SerializeField] private float diveSpeed = 13.5f;
        [SerializeField] private float recoverDuration = 1.35f;
        [SerializeField] private int maxHp = 4;

        private State _state = State.Follow;
        private float _stateTimer = 1.8f;
        private Vector2 _diveTarget;
        private Vector2 _velocity;
        private int _hp;

        private void Awake() => _hp = maxHp;

        private void Update()
        {
            if (player == null) return;

            switch (_state)
            {
                case State.Follow:
                    Vector2 hoverGoal = (Vector2)player.position + Vector2.up * hoverHeight;
                    _velocity = Vector2.Lerp(_velocity, (hoverGoal - (Vector2)transform.position) * 2.5f, Time.deltaTime * 4.5f);
                    _velocity = Vector2.ClampMagnitude(_velocity, followSpeed);
                    transform.position += (Vector3)(_velocity * Time.deltaTime);

                    _stateTimer -= Time.deltaTime;
                    if (_stateTimer <= 0f && Vector2.Distance(transform.position, player.position) < 9.5f)
                    {
                        _state = State.Windup;
                        _stateTimer = 0.42f;
                        _diveTarget = player.position;
                    }
                    break;

                case State.Windup:
                    transform.position += Vector3.up * (0.8f * Time.deltaTime);
                    _stateTimer -= Time.deltaTime;
                    if (_stateTimer <= 0f)
                    {
                        _state = State.Attack;
                        _stateTimer = 0.48f;
                        _velocity = (_diveTarget - (Vector2)transform.position).normalized * diveSpeed;
                    }
                    break;

                case State.Attack:
                    transform.position += (Vector3)(_velocity * Time.deltaTime);
                    _stateTimer -= Time.deltaTime;
                    if (_stateTimer <= 0f)
                    {
                        _state = State.Recover;
                        _stateTimer = recoverDuration;
                    }
                    break;

                case State.Recover:
                    _velocity = Vector2.Lerp(_velocity, Vector2.zero, Time.deltaTime * 6f);
                    transform.position += (Vector3)(_velocity * Time.deltaTime);
                    _stateTimer -= Time.deltaTime;
                    if (_stateTimer <= 0f)
                    {
                        _state = State.Follow;
                        _stateTimer = 1.8f;
                    }
                    break;
            }
        }

        public void TakeDamage(int amount, Vector2 hitDirection)
        {
            _hp -= amount;
            if (_hp <= 0) Destroy(gameObject);
        }
    }
}`,
  },
  {
    id: 'hitstop-manager',
    filename: 'HitStopManager.cs',
    module: 'Core Module 3 · Impact Juice',
    summary: 'Singleton hit-freeze utility using Time.timeScale + realtime WaitForSecondsRealtime so combat strikes land with unmistakable weight.',
    code: `using System.Collections;
using UnityEngine;

namespace Mossgrotto.Player
{
    public class HitStopManager : MonoBehaviour
    {
        public static HitStopManager Instance { get; private set; }
        private bool _isFrozen;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        public void TriggerHitStop(float durationSeconds = 0.045f)
        {
            if (!_isFrozen) StartCoroutine(FreezeRoutine(durationSeconds));
        }

        private IEnumerator FreezeRoutine(float duration)
        {
            _isFrozen = true;
            float previousScale = Time.timeScale;
            Time.timeScale = 0f;
            yield return new WaitForSecondsRealtime(duration);
            Time.timeScale = previousScale;
            _isFrozen = false;
        }
    }
}`,
  },
  {
    id: 'camera-follow-25d',
    filename: 'CameraFollow25D.cs',
    module: 'Module 1 & 2 · 2.5D Camera & Room Bounds',
    summary: 'Smooth look-ahead camera controller with vertical shaft tracking, room-boundary clamping, and decaying combat impulse shake.',
    code: `using UnityEngine;

namespace Mossgrotto.CameraSystem
{
    public class CameraFollow25D : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private Vector2 lookAheadOffset = new Vector2(2.4f, 0.8f);
        [SerializeField] private float smoothTimeX = 0.14f;
        [SerializeField] private float smoothTimeY = 0.18f;
        [SerializeField] private float cameraZ = -10f;

        private Bounds _roomBounds;
        private bool _hasBounds;
        private Vector3 _velocity;
        private float _shakeTimer;
        private float _shakeMagnitude;

        public void SetRoomBounds(Bounds bounds)
        {
            _roomBounds = bounds;
            _hasBounds = true;
        }

        public void TriggerShake(float magnitude, float duration)
        {
            _shakeMagnitude = Mathf.Max(_shakeMagnitude, magnitude);
            _shakeTimer = Mathf.Max(_shakeTimer, duration);
        }

        private void LateUpdate()
        {
            if (target == null) return;

            float desiredX = target.position.x + lookAheadOffset.x * Mathf.Sign(target.localScale.x);
            float desiredY = target.position.y + lookAheadOffset.y;

            if (_hasBounds)
            {
                Camera cam = Camera.main;
                float halfH = cam != null ? cam.orthographicSize : 5f;
                float halfW = cam != null ? halfH * cam.aspect : 9f;
                desiredX = Mathf.Clamp(desiredX, _roomBounds.min.x + halfW, _roomBounds.max.x - halfW);
                desiredY = Mathf.Clamp(desiredY, _roomBounds.min.y + halfH, _roomBounds.max.y - halfH);
            }

            float nextX = Mathf.SmoothDamp(transform.position.x, desiredX, ref _velocity.x, smoothTimeX);
            float nextY = Mathf.SmoothDamp(transform.position.y, desiredY, ref _velocity.y, smoothTimeY);

            Vector3 shakeOffset = Vector3.zero;
            if (_shakeTimer > 0f)
            {
                _shakeTimer -= Time.deltaTime;
                shakeOffset = (Vector3)(Random.insideUnitCircle * _shakeMagnitude);
                if (_shakeTimer <= 0f) _shakeMagnitude = 0f;
            }

            transform.position = new Vector3(nextX, nextY, cameraZ) + shakeOffset;
        }
    }
}`,
  },
  {
    id: 'springy-foliage',
    filename: 'SpringyFoliage2D.cs',
    module: 'Module 1 · Interactive 2.5D Terrain',
    summary: 'Harmonic spring-damper controller for interactive moss tufts and hanging ropes that compress, squash, and sway on player contact.',
    code: `using UnityEngine;

namespace Mossgrotto.Environment
{
    public class SpringyFoliage2D : MonoBehaviour
    {
        [SerializeField] private float springStiffness = 140f;
        [SerializeField] private float damping = 9.5f;
        [SerializeField] private float maxBendDegrees = 32f;

        private float _angle;
        private float _angularVelocity;

        private void Update()
        {
            float force = -springStiffness * _angle - damping * _angularVelocity;
            _angularVelocity += force * Time.deltaTime;
            _angle = Mathf.Clamp(_angle + _angularVelocity * Time.deltaTime, -maxBendDegrees, maxBendDegrees);
            transform.localRotation = Quaternion.Euler(0f, 0f, _angle);
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (other.TryGetComponent<Rigidbody2D>(out var rb))
            {
                _angularVelocity += Mathf.Clamp(rb.linearVelocity.x * 18f, -380f, 380f);
            }
        }
    }
}`,
  },
  {
    id: 'bioluminescent-light',
    filename: 'BioluminescentLight2D.cs',
    module: 'Module 1 · URP 2D Global Illumination',
    summary: 'Atmospheric pulse & drifting firefly driver for Unity URP Light2D glow points against dark cavern walls.',
    code: `using UnityEngine;
using UnityEngine.Rendering.Universal;

namespace Mossgrotto.Environment
{
    [RequireComponent(typeof(Light2D))]
    public class BioluminescentLight2D : MonoBehaviour
    {
        [SerializeField] private float baseIntensity = 1.35f;
        [SerializeField] private float pulseAmplitude = 0.25f;
        [SerializeField] private float pulseSpeed = 2.2f;
        [SerializeField] private bool driftAsFirefly = false;
        [SerializeField] private float driftRadius = 0.65f;

        private Light2D _light;
        private Vector3 _origin;
        private float _phaseOffset;

        private void Awake()
        {
            _light = GetComponent<Light2D>();
            _origin = transform.position;
            _phaseOffset = Random.Range(0f, Mathf.PI * 2f);
        }

        private void Update()
        {
            float t = Time.time * pulseSpeed + _phaseOffset;
            _light.intensity = baseIntensity + Mathf.Sin(t) * pulseAmplitude;

            if (driftAsFirefly)
            {
                transform.position = _origin + new Vector3(
                    Mathf.Sin(t * 0.6f) * driftRadius,
                    Mathf.Cos(t * 0.8f) * driftRadius * 0.6f,
                    0f
                );
            }
        }
    }
}`,
  },
  {
    id: 'map-manager',
    filename: 'MapManager.cs',
    module: 'Module 3 · Procedural / Grid Map',
    summary: 'Grid-based Metroidvania map state manager tracking visited rooms, adjacent mapped rooms, benches, and secret wall reveals.',
    code: `using System;
using System.Collections.Generic;
using UnityEngine;

namespace Mossgrotto.Map
{
    [Serializable]
    public class RoomNode
    {
        public string roomId;
        public string displayName;
        public Vector2Int gridCoord;
        public Bounds worldBounds;
        public bool isSecret;
        public bool hasBench;
        public bool isBossRoom;
        public bool discovered;
        public bool visited;
        public List<string> adjacentIds = new();
    }

    public class MapManager : MonoBehaviour
    {
        public static MapManager Instance { get; private set; }
        public event Action OnMapUpdated;

        [SerializeField] private List<RoomNode> rooms = new();
        private readonly Dictionary<string, RoomNode> _lookup = new();

        public string CurrentRoomId { get; private set; }
        public IReadOnlyList<RoomNode> Rooms => rooms;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else { Destroy(gameObject); return; }

            foreach (RoomNode room in rooms)
                _lookup[room.roomId] = room;
        }

        public void EnterRoom(string roomId)
        {
            if (!_lookup.TryGetValue(roomId, out RoomNode room)) return;

            CurrentRoomId = roomId;
            room.visited = true;
            room.discovered = true;

            foreach (string adjId in room.adjacentIds)
            {
                if (_lookup.TryGetValue(adjId, out RoomNode adj) && !adj.isSecret)
                    adj.discovered = true;
            }

            OnMapUpdated?.Invoke();
        }

        public void RevealSecretRoom(string roomId)
        {
            if (_lookup.TryGetValue(roomId, out RoomNode room))
            {
                room.discovered = true;
                OnMapUpdated?.Invoke();
            }
        }
    }
}`,
  },
  {
    id: 'map-ui',
    filename: 'MapUI.cs',
    module: 'Module 3 · Interactive Zoom/Pan Map UI',
    summary: 'Full-screen interactive Metroidvania map controller supporting smooth scroll-wheel zooming, drag panning, and mini-HUD toggling.',
    code: `using UnityEngine;
using UnityEngine.EventSystems;

namespace Mossgrotto.Map
{
    public class MapUI : MonoBehaviour, IDragHandler, IScrollHandler
    {
        [SerializeField] private RectTransform mapContainer;
        [SerializeField] private GameObject fullMapPanel;
        [SerializeField] private float minZoom = 0.65f;
        [SerializeField] private float maxZoom = 2.4f;
        [SerializeField] private float zoomStep = 0.15f;

        private float _currentZoom = 1f;
        private bool _isOpen;

        private void Update()
        {
            if (Input.GetKeyDown(KeyCode.M) || Input.GetKeyDown(KeyCode.Tab))
                ToggleMap();
        }

        public void ToggleMap()
        {
            _isOpen = !_isOpen;
            fullMapPanel.SetActive(_isOpen);
            Time.timeScale = _isOpen ? 0f : 1f;
        }

        public void OnDrag(PointerEventData eventData)
        {
            if (mapContainer != null)
                mapContainer.anchoredPosition += eventData.delta;
        }

        public void OnScroll(PointerEventData eventData)
        {
            if (mapContainer == null) return;
            _currentZoom = Mathf.Clamp(_currentZoom + eventData.scrollDelta.y * zoomStep, minZoom, maxZoom);
            mapContainer.localScale = Vector3.one * _currentZoom;
        }

        public void ResetView()
        {
            _currentZoom = 1f;
            if (mapContainer != null)
            {
                mapContainer.localScale = Vector3.one;
                mapContainer.anchoredPosition = Vector2.zero;
            }
        }
    }
}`,
  },
  {
    id: 'water-volume-2d',
    filename: 'WaterVolume2D.cs',
    module: 'Module 2 · Water & Buoyancy Physics',
    summary: 'Trigger volume dampening gravity, applying upward buoyancy, surface splash particle bursts, and clean water-exit jumps.',
    code: `using UnityEngine;

namespace Mossgrotto.Environment
{
    [RequireComponent(typeof(BoxCollider2D))]
    public class WaterVolume2D : MonoBehaviour
    {
        [Header("Buoyancy & Drag")]
        [SerializeField] private float waterGravityScale = 0.65f;
        [SerializeField] private float buoyancyAcceleration = 16.5f;
        [SerializeField] private float verticalSwimSpeed = 5.5f;
        [SerializeField] private float linearDragInWater = 3.2f;
        [SerializeField] private ParticleSystem splashParticles;

        private BoxCollider2D _bounds;

        private void Awake()
        {
            _bounds = GetComponent<BoxCollider2D>();
            _bounds.isTrigger = true;
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (other.TryGetComponent<Rigidbody2D>(out var rb))
            {
                rb.gravityScale = waterGravityScale;
                rb.linearDamping = linearDragInWater;
                if (splashParticles != null)
                {
                    splashParticles.transform.position = new Vector3(other.transform.position.x, _bounds.bounds.max.y, 0f);
                    splashParticles.Play();
                }
            }
        }

        private void OnTriggerStay2D(Collider2D other)
        {
            if (!other.TryGetComponent<Rigidbody2D>(out var rb)) return;

            float surfaceY = _bounds.bounds.max.y;
            float depth = Mathf.Clamp01((surfaceY - other.transform.position.y) / 1.2f);
            rb.AddForce(Vector2.up * (buoyancyAcceleration * depth), ForceMode2D.Force);

            float verticalInput = Input.GetAxisRaw("Vertical");
            if (Mathf.Abs(verticalInput) > 0.1f)
            {
                float targetVy = verticalInput * verticalSwimSpeed;
                rb.linearVelocity = new Vector2(rb.linearVelocity.x, Mathf.Lerp(rb.linearVelocity.y, targetVy, Time.fixedDeltaTime * 6f));
            }
        }

        private void OnTriggerExit2D(Collider2D other)
        {
            if (other.TryGetComponent<Rigidbody2D>(out var rb))
            {
                rb.gravityScale = 3.2f;
                rb.linearDamping = 0f;
            }
        }
    }
}`,
  },
  {
    id: 'silk-float-2d',
    filename: 'SilkFloatController2D.cs',
    module: 'Module 2 · Airborne Float & Silk Streams',
    summary: 'Optional airborne Silk Float toggle/glide and vertical Silk Ascent Stream lift for navigating vertical shafts smoothly.',
    code: `using UnityEngine;

namespace Mossgrotto.Player
{
    [RequireComponent(typeof(Rigidbody2D), typeof(PlayerMotor2D))]
    public class SilkFloatController2D : MonoBehaviour
    {
        [SerializeField] private float floatMaxFallSpeed = 1.8f;
        [SerializeField] private float silkStreamLiftSpeed = 8.2f;
        [SerializeField] private LineRenderer silkTetherLine;

        private Rigidbody2D _rb;
        private PlayerMotor2D _motor;
        private bool _floatActive;
        private bool _insideAirStream;

        private void Awake()
        {
            _rb = GetComponent<Rigidbody2D>();
            _motor = GetComponent<PlayerMotor2D>();
        }

        private void Update()
        {
            if (_motor.IsGrounded)
                _floatActive = false;
            else if (Input.GetKeyDown(KeyCode.E) || Input.GetKeyDown(KeyCode.G))
                _floatActive = !_floatActive;

            bool holdingGlide = !_motor.IsGrounded && Input.GetButton("Jump") && _rb.linearVelocity.y < -0.5f;
            bool isFloating = _floatActive || holdingGlide || _insideAirStream;

            if (silkTetherLine != null)
                silkTetherLine.enabled = isFloating;
        }

        private void FixedUpdate()
        {
            if (_insideAirStream)
            {
                float nextY = Mathf.Lerp(_rb.linearVelocity.y, silkStreamLiftSpeed, Time.fixedDeltaTime * 6.5f);
                _rb.linearVelocity = new Vector2(_rb.linearVelocity.x, nextY);
            }
            else if ((_floatActive || Input.GetButton("Jump")) && !_motor.IsGrounded && _rb.linearVelocity.y < -floatMaxFallSpeed)
            {
                _rb.linearVelocity = new Vector2(_rb.linearVelocity.x, -floatMaxFallSpeed);
            }
        }

        public void SetInsideAirStream(bool active) => _insideAirStream = active;
    }
}`,
  },
];
